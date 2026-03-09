import { StateGraph, Annotation, END, START } from "@langchain/langgraph";
import { createServiceClientDirect } from "@/lib/supabase/server";
import { monitorOverdueScripts } from "./nodes/monitor";
import { retrieveClientMemories } from "./nodes/ragRetrieval";
import { analyzeSentiment } from "./nodes/sentimentAnalysis";
import { generateChaser } from "./nodes/generation";
import { selfCritique } from "./nodes/selfCritique";
import { reviseEmail } from "./nodes/revision";
import { addStreamEvent } from "./stream";
import type { AgentState, CritiqueScores, NodeLogEntry } from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAny = any;

const MAX_REVISIONS = 2;
// With binary criteria (10 checks), 8/10 = 80% pass rate required
const MIN_PASS_RATE = 8; // minimum average score out of 10

const GraphState = Annotation.Root({
  scriptId: Annotation<string>(),
  clientId: Annotation<string>(),
  clientEmail: Annotation<string>(),
  clientName: Annotation<string>(),
  scriptTitle: Annotation<string>(),
  scriptContent: Annotation<string>(),
  sentAt: Annotation<string>(),
  dueDate: Annotation<string | null>(),
  hoursOverdue: Annotation<number>(),
  clientMemories: Annotation<string[]>(),
  generatedEmail: Annotation<string | null>(),
  emailSubject: Annotation<string | null>(),
  chaserId: Annotation<string | null>(),
  error: Annotation<string | null>(),
  urgencyScore: Annotation<number | null>(),
  toneRecommendation: Annotation<string | null>(),
  critiqueScores: Annotation<CritiqueScores | null>(),
  revisionCount: Annotation<number>(),
  nodeExecutionLog: Annotation<NodeLogEntry[]>(),
});

async function ragNode(state: typeof GraphState.State): Promise<Partial<typeof GraphState.State>> {
  addStreamEvent(state.scriptId, { node: "ragRetrieval", status: "started", timestamp: new Date().toISOString() });
  const result = await retrieveClientMemories(state as AgentState);
  addStreamEvent(state.scriptId, { node: "ragRetrieval", status: "completed", timestamp: new Date().toISOString(), data: { memoriesFound: result.clientMemories.length } });
  return { clientMemories: result.clientMemories };
}

async function sentimentNode(state: typeof GraphState.State): Promise<Partial<typeof GraphState.State>> {
  addStreamEvent(state.scriptId, { node: "sentimentAnalysis", status: "started", timestamp: new Date().toISOString() });
  const result = await analyzeSentiment(state as AgentState);
  addStreamEvent(state.scriptId, { node: "sentimentAnalysis", status: "completed", timestamp: new Date().toISOString(), data: { urgencyScore: result.urgencyScore, tone: result.toneRecommendation } });
  return {
    urgencyScore: result.urgencyScore,
    toneRecommendation: result.toneRecommendation,
    nodeExecutionLog: result.nodeExecutionLog,
  };
}

async function generationNode(state: typeof GraphState.State): Promise<Partial<typeof GraphState.State>> {
  addStreamEvent(state.scriptId, { node: "generation", status: "started", timestamp: new Date().toISOString() });
  const result = await generateChaser(state as AgentState);
  addStreamEvent(state.scriptId, { node: "generation", status: result.error ? "error" : "completed", timestamp: new Date().toISOString(), data: { chaserId: result.chaserId } });
  return {
    generatedEmail: result.generatedEmail,
    emailSubject: result.emailSubject,
    chaserId: result.chaserId,
    error: result.error,
    nodeExecutionLog: result.nodeExecutionLog,
  };
}

async function critiqueNode(state: typeof GraphState.State): Promise<Partial<typeof GraphState.State>> {
  addStreamEvent(state.scriptId, { node: "selfCritique", status: "started", timestamp: new Date().toISOString() });
  const result = await selfCritique(state as AgentState);
  addStreamEvent(state.scriptId, { node: "selfCritique", status: "completed", timestamp: new Date().toISOString(), data: { scores: result.critiqueScores } });
  return {
    critiqueScores: result.critiqueScores,
    nodeExecutionLog: result.nodeExecutionLog,
  };
}

async function revisionNode(state: typeof GraphState.State): Promise<Partial<typeof GraphState.State>> {
  addStreamEvent(state.scriptId, { node: "revision", status: "started", timestamp: new Date().toISOString() });
  const result = await reviseEmail(state as AgentState);
  addStreamEvent(state.scriptId, { node: "revision", status: "completed", timestamp: new Date().toISOString(), data: { revisionCount: result.revisionCount } });
  return {
    generatedEmail: result.generatedEmail,
    emailSubject: result.emailSubject,
    revisionCount: result.revisionCount,
    critiqueScores: result.critiqueScores,
    nodeExecutionLog: result.nodeExecutionLog,
  };
}

function routeAfterCritique(state: typeof GraphState.State): "revision" | "finalize" {
  if (
    state.critiqueScores &&
    state.critiqueScores.average < MIN_PASS_RATE &&
    state.revisionCount < MAX_REVISIONS
  ) {
    return "revision";
  }
  return "finalize";
}

async function finalizeNode(state: typeof GraphState.State): Promise<Partial<typeof GraphState.State>> {
  if (!state.chaserId) return {};

  const supabase: SupabaseAny = createServiceClientDirect();

  const updatePayload: Record<string, unknown> = {};

  // Always save the latest draft content
  if (state.generatedEmail) {
    updatePayload.draft_content = state.generatedEmail;
  }

  // Build comprehensive hitl_state with all context
  updatePayload.hitl_state = {
    email_subject: state.emailSubject,
    client_email: state.clientEmail,
    hours_overdue: state.hoursOverdue,
    memories_used: state.clientMemories.length,
    tone_recommendation: state.toneRecommendation ?? "neutral",
    urgency_score: state.urgencyScore,
    revision_count: state.revisionCount,
    ...(state.critiqueScores ? {
      critique_scores: {
        professionalism: state.critiqueScores.professionalism,
        personalization: state.critiqueScores.personalization,
        clarity: state.critiqueScores.clarity,
        persuasiveness: state.critiqueScores.persuasiveness,
        average: state.critiqueScores.average,
      },
      critique_feedback: state.critiqueScores.feedback,
    } : {}),
  };

  if (Object.keys(updatePayload).length > 0) {
    const { error } = await supabase.from("chasers").update(updatePayload).eq("id", state.chaserId);
    if (error) {
      console.error("[finalize] Failed to update chaser:", error.message);
    }
  }

  return {};
}

const workflow = new StateGraph(GraphState)
  .addNode("ragRetrieval", ragNode)
  .addNode("sentimentAnalysis", sentimentNode)
  .addNode("generation", generationNode)
  .addNode("selfCritique", critiqueNode)
  .addNode("revision", revisionNode)
  .addNode("finalize", finalizeNode)
  .addEdge(START, "ragRetrieval")
  .addEdge("ragRetrieval", "sentimentAnalysis")
  .addEdge("sentimentAnalysis", "generation")
  .addEdge("generation", "selfCritique")
  .addConditionalEdges("selfCritique", routeAfterCritique)
  .addEdge("revision", "selfCritique")
  .addEdge("finalize", END)
  .compile();

function defaultState(): Partial<AgentState> {
  return {
    urgencyScore: null,
    toneRecommendation: null,
    critiqueScores: null,
    revisionCount: 0,
    nodeExecutionLog: [],
  };
}

export async function runChaserForScript(initialState: AgentState): Promise<AgentState> {
  const fullState = { ...defaultState(), ...initialState };
  const result = await workflow.invoke(fullState);
  return result as AgentState;
}

export async function runChaserAgent(): Promise<{ processed: number; errors: string[] }> {
  const overdueScripts = await monitorOverdueScripts();

  if (overdueScripts.length === 0) {
    console.log("[agent] No overdue scripts to process");
    return { processed: 0, errors: [] };
  }

  const errors: string[] = [];
  let processed = 0;

  for (const state of overdueScripts) {
    try {
      const result = await runChaserForScript(state);
      if (result.error) {
        errors.push(`Script ${state.scriptId}: ${result.error}`);
      } else {
        processed++;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      errors.push(`Script ${state.scriptId}: ${msg}`);
    }
  }

  console.log(`[agent] Processed ${processed}/${overdueScripts.length}, errors: ${errors.length}`);
  return { processed, errors };
}
