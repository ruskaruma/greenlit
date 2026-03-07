import { ChatAnthropic } from "@langchain/anthropic";
import type { AgentState, CritiqueScores, NodeLogEntry } from "../types";

const model = new ChatAnthropic({
  model: "claude-haiku-4-5-20251001",
  maxTokens: 400,
  temperature: 0,
});

const systemPrompt = `You are an email quality reviewer. Score the follow-up email draft on 4 rubrics (1-10 each).
Output EXACTLY this JSON format (no markdown):
{"professionalism": <1-10>, "personalization": <1-10>, "clarity": <1-10>, "persuasiveness": <1-10>, "feedback": "<one sentence on what to improve>"}`;

export async function selfCritique(state: AgentState): Promise<AgentState> {
  const start = Date.now();

  if (!state.generatedEmail) {
    return state;
  }

  try {
    const response = await model.invoke([
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `Context: Follow-up to ${state.clientName} about "${state.scriptTitle}", ${state.hoursOverdue}h overdue.\nTarget tone: ${state.toneRecommendation ?? "neutral"}\n\nDraft email:\n${state.generatedEmail}`,
      },
    ]);

    const text = typeof response.content === "string"
      ? response.content
      : (response.content as Array<{ type: string; text?: string }>)
          .filter((b) => b.type === "text")
          .map((b) => b.text)
          .join("");

    const parsed = JSON.parse(text.replace(/```json\n?|\n?```/g, '').trim());
    const avg = (parsed.professionalism + parsed.personalization + parsed.clarity + parsed.persuasiveness) / 4;

    const scores: CritiqueScores = {
      professionalism: parsed.professionalism,
      personalization: parsed.personalization,
      clarity: parsed.clarity,
      persuasiveness: parsed.persuasiveness,
      average: Math.round(avg * 10) / 10,
      feedback: parsed.feedback,
    };

    const entry: NodeLogEntry = {
      node: "selfCritique",
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - start,
      summary: `Avg: ${scores.average}/10 (P:${scores.professionalism} Pe:${scores.personalization} C:${scores.clarity} Pu:${scores.persuasiveness})`,
    };

    return {
      ...state,
      critiqueScores: scores,
      nodeExecutionLog: [...state.nodeExecutionLog, entry],
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Self-critique failed";
    console.error("[selfCritique]", message);

    const entry: NodeLogEntry = {
      node: "selfCritique",
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - start,
      summary: `Error: ${message}`,
    };

    return {
      ...state,
      critiqueScores: null,
      nodeExecutionLog: [...state.nodeExecutionLog, entry],
    };
  }
}
