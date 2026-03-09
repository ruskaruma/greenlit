import { StateGraph, Annotation, END, START, interrupt, Command } from "@langchain/langgraph";
import { createServiceClientDirect } from "@/lib/supabase/server";
import { SupabaseCheckpointSaver } from "./checkpointer";
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
  // HITL interrupt/resume fields
  hitlAction: Annotation<string | null>(),
  hitlEditedContent: Annotation<string | null>(),
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

/**
 * HITL node — pauses the graph via interrupt().
 * The team lead's action (approved/edited/rejected) is returned as the resume value.
 * Graph state is serialized to Supabase via SupabaseCheckpointSaver.
 */
function hitlNode(state: typeof GraphState.State): Partial<typeof GraphState.State> {
  addStreamEvent(state.scriptId, { node: "hitl", status: "started", timestamp: new Date().toISOString() });

  // interrupt() pauses here. Resume value = { action, editedContent? }
  const resume = interrupt({
    chaserId: state.chaserId,
    scriptId: state.scriptId,
    clientId: state.clientId,
    draftContent: state.generatedEmail,
    emailSubject: state.emailSubject,
    critiqueScores: state.critiqueScores,
  });

  const action = (resume as { action: string }).action;
  const editedContent = (resume as { editedContent?: string }).editedContent ?? null;

  addStreamEvent(state.scriptId, { node: "hitl", status: "completed", timestamp: new Date().toISOString(), data: { action } });

  return {
    hitlAction: action,
    hitlEditedContent: editedContent,
    // If edited, update the email content
    ...(editedContent ? { generatedEmail: editedContent } : {}),
  };
}

function routeAfterHitl(state: typeof GraphState.State): "delivery" | "generation" | typeof END {
  if (state.hitlAction === "approved" || state.hitlAction === "edited") {
    return "delivery";
  }
  if (state.hitlAction === "rejected") {
    // Loop back to generation for a new draft
    return "generation";
  }
  return END;
}

/**
 * Delivery node — the graph proceeds here after HITL approval.
 * Marks the chaser as approved/edited in DB. Actual email/WhatsApp send
 * is still handled by the approve route for now (keeps delivery logic
 * in one place with error handling + channel selection).
 */
async function deliveryNode(state: typeof GraphState.State): Promise<Partial<typeof GraphState.State>> {
  if (!state.chaserId) return {};

  const supabase: SupabaseAny = createServiceClientDirect();
  const newStatus = state.hitlAction === "edited" ? "edited" : "approved";

  const updatePayload: Record<string, unknown> = {
    status: newStatus,
  };

  if (state.hitlEditedContent) {
    updatePayload.draft_content = state.hitlEditedContent;
    updatePayload.team_lead_edits = state.hitlEditedContent;
  }

  const { error } = await supabase.from("chasers").update(updatePayload).eq("id", state.chaserId);
  if (error) {
    console.error("[delivery] Failed to update chaser:", error.message);
  }

  addStreamEvent(state.scriptId, { node: "delivery", status: "completed", timestamp: new Date().toISOString(), data: { status: newStatus } });

  return {};
}

const checkpointer = new SupabaseCheckpointSaver();

const workflow = new StateGraph(GraphState)
  .addNode("ragRetrieval", ragNode)
  .addNode("sentimentAnalysis", sentimentNode)
  .addNode("generation", generationNode)
  .addNode("selfCritique", critiqueNode)
  .addNode("revision", revisionNode)
  .addNode("finalize", finalizeNode)
  .addNode("hitl", hitlNode)
  .addNode("delivery", deliveryNode)
  .addEdge(START, "ragRetrieval")
  .addEdge("ragRetrieval", "sentimentAnalysis")
  .addEdge("sentimentAnalysis", "generation")
  .addEdge("generation", "selfCritique")
  .addConditionalEdges("selfCritique", routeAfterCritique)
  .addEdge("revision", "selfCritique")
  .addEdge("finalize", "hitl")
  .addConditionalEdges("hitl", routeAfterHitl)
  .addEdge("delivery", END)
  .compile({ checkpointer });

function defaultState(): Partial<AgentState> {
  return {
    urgencyScore: null,
    toneRecommendation: null,
    critiqueScores: null,
    revisionCount: 0,
    nodeExecutionLog: [],
  };
}

/**
 * Run the chaser graph for a single script.
 * The graph will pause at the HITL node (interrupt) and return.
 * Thread ID = script ID so we can resume later.
 */
export async function runChaserForScript(initialState: AgentState): Promise<AgentState> {
  const fullState = { ...defaultState(), ...initialState, hitlAction: null, hitlEditedContent: null };
  const threadId = `chaser-${initialState.scriptId}`;

  const config = {
    configurable: { thread_id: threadId },
  };

  const result = await workflow.invoke(fullState, config);
  return result as AgentState;
}

/**
 * Resume a paused graph after HITL decision.
 * Called by the resume API route.
 */
export async function resumeChaserGraph(
  threadId: string,
  action: "approved" | "edited" | "rejected",
  editedContent?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const resumeValue = { action, editedContent: editedContent ?? null };

    await workflow.invoke(new Command({ resume: resumeValue }), {
      configurable: { thread_id: threadId },
    });

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Resume failed";
    console.error("[graph] Resume failed:", message);
    return { success: false, error: message };
  }
}

/**
 * Get the current state of a paused graph thread.
 */
export async function getThreadState(threadId: string) {
  return workflow.getState({ configurable: { thread_id: threadId } });
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
