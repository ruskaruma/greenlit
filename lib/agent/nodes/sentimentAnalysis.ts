import { ChatAnthropic } from "@langchain/anthropic";
import type { AgentState, NodeLogEntry } from "../types";

const model = new ChatAnthropic({
  model: "claude-haiku-4-5-20251001",
  maxTokens: 300,
  temperature: 0,
});

const systemPrompt = `You analyze client follow-up situations and recommend an email tone.
Given the context, output EXACTLY this JSON format (no markdown):
{"urgencyScore": <1-10>, "toneRecommendation": "<one of: gentle, neutral, firm, urgent>"}

Scoring guide:
- 1-3: Low urgency (just overdue, new client, no history of ignoring)
- 4-6: Medium urgency (significantly overdue, or has ignored before)
- 7-10: High urgency (very overdue, repeated non-response, deadline-sensitive)`;

export async function analyzeSentiment(state: AgentState): Promise<AgentState> {
  const start = Date.now();

  try {
    const memoryContext = state.clientMemories.length > 0
      ? `Past interactions:\n${state.clientMemories.join("\n")}`
      : "No prior interaction history.";

    const response = await model.invoke([
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `Client: ${state.clientName}\nScript: "${state.scriptTitle}"\nHours overdue: ${state.hoursOverdue}\n${memoryContext}`,
      },
    ]);

    const text = typeof response.content === "string"
      ? response.content
      : (response.content as Array<{ type: string; text?: string }>)
          .filter((b) => b.type === "text")
          .map((b) => b.text)
          .join("");

    const parsed = JSON.parse(text.replace(/```[\w]*\n?/g, '').replace(/\n?```/g, '').trim());

    const entry: NodeLogEntry = {
      node: "sentimentAnalysis",
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - start,
      summary: `Urgency: ${parsed.urgencyScore}/10, Tone: ${parsed.toneRecommendation}`,
    };

    return {
      ...state,
      urgencyScore: parsed.urgencyScore,
      toneRecommendation: parsed.toneRecommendation,
      nodeExecutionLog: [...state.nodeExecutionLog, entry],
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sentiment analysis failed";
    console.error("[sentimentAnalysis]", message);

    const entry: NodeLogEntry = {
      node: "sentimentAnalysis",
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - start,
      summary: `Error: ${message}`,
    };

    return {
      ...state,
      urgencyScore: 5,
      toneRecommendation: "neutral",
      nodeExecutionLog: [...state.nodeExecutionLog, entry],
    };
  }
}
