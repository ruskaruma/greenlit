import { ChatAnthropic } from "@langchain/anthropic";
import type { AgentState, NodeLogEntry } from "../types";

const model = new ChatAnthropic({
  model: "claude-haiku-4-5-20251001",
  maxTokens: 500,
  temperature: 0.7,
});

const systemPrompt = `You are revising a follow-up email draft based on critique feedback.
Keep the same SUBJECT: / BODY: format. Keep the email under 150 words.
Improve the draft based on the feedback while preserving the core message.`;

export async function reviseEmail(state: AgentState): Promise<AgentState> {
  const start = Date.now();

  if (!state.generatedEmail || !state.critiqueScores) {
    return state;
  }

  try {
    const response = await model.invoke([
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `Original draft:\nSUBJECT: ${state.emailSubject}\nBODY: ${state.generatedEmail}\n\nCritique feedback: ${state.critiqueScores.feedback}\nScores - Professionalism: ${state.critiqueScores.professionalism}, Personalization: ${state.critiqueScores.personalization}, Clarity: ${state.critiqueScores.clarity}, Persuasiveness: ${state.critiqueScores.persuasiveness}\nTarget tone: ${state.toneRecommendation ?? "neutral"}\n\nRevise the email to address the feedback. Output in SUBJECT: / BODY: format.`,
      },
    ]);

    const text = typeof response.content === "string"
      ? response.content
      : (response.content as Array<{ type: string; text?: string }>)
          .filter((b) => b.type === "text")
          .map((b) => b.text)
          .join("");

    const subjectMatch = text.match(/SUBJECT:\s*(.+?)(?:\n|$)/i);
    const bodyMatch = text.match(/BODY:\s*([\s\S]+)/i);

    const newSubject = subjectMatch?.[1]?.trim() ?? state.emailSubject;
    const newBody = bodyMatch?.[1]?.trim() ?? state.generatedEmail;

    const entry: NodeLogEntry = {
      node: "revision",
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - start,
      summary: `Revision ${state.revisionCount + 1} applied`,
    };

    return {
      ...state,
      generatedEmail: newBody,
      emailSubject: newSubject,
      revisionCount: state.revisionCount + 1,
      critiqueScores: null,
      nodeExecutionLog: [...state.nodeExecutionLog, entry],
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Revision failed";
    console.error("[revision]", message);

    const entry: NodeLogEntry = {
      node: "revision",
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - start,
      summary: `Error: ${message}`,
    };

    return {
      ...state,
      nodeExecutionLog: [...state.nodeExecutionLog, entry],
    };
  }
}
