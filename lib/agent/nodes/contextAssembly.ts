import { ChatPromptTemplate } from "@langchain/core/prompts";
import { getFewShotExamples } from "../fewShot";
import type { AgentState } from "../types";

function formatReadableDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric" });
}

function buildToneInstructions(tone: string | null, urgencyScore: number | null): string {
  const t = tone ?? "neutral";
  const u = urgencyScore ?? 5;

  switch (t) {
    case "gentle":
      return "TONE: Warm and patient. Acknowledge they may be busy. Soft deadline suggestion. No pressure.";
    case "neutral":
      return "TONE: Professional and direct. State what you need clearly. Give a specific deadline.";
    case "firm":
      return `TONE: Assertive and clear. This is ${Math.round(u >= 7 ? u : 6)}+ urgency. State the deadline firmly. Make it clear you need a response.`;
    case "urgent":
      return `TONE: High-priority. This is blocking work. Use words like "urgent", "blocking", "need your response today". Be direct but not rude.`;
    default:
      return "TONE: Professional and direct.";
  }
}

function buildSystemPrompt(state: AgentState): string {
  const daysOverdue = Math.round(state.hoursOverdue / 24);
  const sentDate = formatReadableDate(state.sentAt);
  const dueDate = state.dueDate ? formatReadableDate(state.dueDate) : null;
  const dueLine = dueDate ? `\nThe review deadline was ${dueDate}.` : "";

  const toneInstructions = buildToneInstructions(state.toneRecommendation, state.urgencyScore);

  const memoryContext = state.clientMemories.length > 0
    ? state.clientMemories.map(m => `- ${m}`).join("\n")
    : "- No previous interactions on record.";

  return `You write short follow-up emails for Scrollhouse, a video content agency. Your goal: get the client to respond with their script review.

${toneInstructions}

RULES:
- First sentence: mention the script "${state.scriptTitle}" by name and when it was sent (${sentDate}).
- Reference something specific from the script content to show you care about their project.
- Include a clear ask with a specific deadline date.
- Sign off: "Best, Scrollhouse Team"
- Maximum 120 words. Short paragraphs.
- No pleasantries ("hope you're well"), no cliches ("just checking in", "circling back").
- No em dashes, no exclamation marks, no emojis.

CONTEXT:
Client: ${state.clientName}
Script: "${state.scriptTitle}" — ${daysOverdue} day${daysOverdue !== 1 ? "s" : ""} overdue
Sent on: ${sentDate}${dueLine}

What you know about this client:
${memoryContext}

Format your response exactly as:
SUBJECT: [subject line]
BODY: [email body]`;
}

function buildHumanPrompt(state: AgentState): string {
  const contentPreview = state.scriptContent.length > 500
    ? state.scriptContent.slice(0, 500) + "..."
    : state.scriptContent;

  return `Write a follow-up email for this situation:

Client: ${state.clientName}
Script: "${state.scriptTitle}"
Script content:
${contentPreview}

This was sent ${state.hoursOverdue} hours ago with no response. Write a personalized follow-up that references something specific from the script content above.`;
}

function buildFewShotBlock(examples: { original_draft: string; edited_draft: string }[]): string {
  if (examples.length === 0) return "";

  const formatted = examples.map((ex, i) =>
    `Example ${i + 1}:
ORIGINAL (AI draft): ${ex.original_draft.slice(0, 300)}${ex.original_draft.length > 300 ? "..." : ""}
PREFERRED (team lead edit): ${ex.edited_draft.slice(0, 300)}${ex.edited_draft.length > 300 ? "..." : ""}`
  ).join("\n\n");

  return `\n\nFEW-SHOT EXAMPLES — the team lead has previously edited drafts for this client. Match their preferred style:\n${formatted}\n`;
}

export async function assembleContext(state: AgentState): Promise<{
  prompt: ChatPromptTemplate;
  variables: Record<string, string>;
}> {
  // Fetch few-shot examples for this client
  const examples = await getFewShotExamples(state.clientId, 3);
  const fewShotBlock = buildFewShotBlock(examples);
  const systemPrompt = buildSystemPrompt(state) + fewShotBlock;

  const prompt = ChatPromptTemplate.fromMessages([
    ["system", systemPrompt],
    ["human", "{humanMessage}"],
  ]);

  return {
    prompt,
    variables: { humanMessage: buildHumanPrompt(state) },
  };
}
