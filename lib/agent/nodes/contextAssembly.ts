import { ChatPromptTemplate } from "@langchain/core/prompts";
import type { AgentState } from "../types";

function formatReadableDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric" });
}

function buildSystemPrompt(state: AgentState): string {
  const toneGuide = state.toneRecommendation
    ? `\nAdapt your tone to be: ${state.toneRecommendation}.`
    : "";

  const daysOverdue = Math.round(state.hoursOverdue / 24);
  const sentDate = formatReadableDate(state.sentAt);
  const dueDate = state.dueDate ? formatReadableDate(state.dueDate) : null;
  const dueLine = dueDate ? `\nThe review deadline was ${dueDate}.` : "";

  const memoryContext = state.clientMemories.length > 0
    ? state.clientMemories.map(m => `- ${m}`).join("\n")
    : "- No previous interactions on record. Keep message warm but professional.";

  return `You are writing a personalised follow-up message for a content agency client.

Client: ${state.clientName}
Script: "${state.scriptTitle}" — ${daysOverdue} days overdue

What you know about this client from past interactions:
${memoryContext}

Write a follow-up message that:
1. Is specific to this client and script — not generic
2. Creates gentle urgency without being pushy
3. Makes it easy to respond (suggest they reply APPROVE, REJECT, or their feedback)
4. Is under 150 words${toneGuide}

The script was sent on ${sentDate}.${dueLine}
Always sign off as "Scrollhouse Team" — never use placeholder text like [Your Name] or [date].

Format your response exactly as:
SUBJECT: [subject line]
BODY: [email body]`;
}

function buildHumanPrompt(state: AgentState): string {
  const contentPreview = state.scriptContent.length > 300
    ? state.scriptContent.slice(0, 300) + "..."
    : state.scriptContent;

  return `Write a follow-up email for this situation:

Client: ${state.clientName}
Script: "${state.scriptTitle}"
Script preview: ${contentPreview}
Sent ${state.hoursOverdue} hours ago with no response.

Write a short, personalized follow-up email. Reference the specific script.
If you know their communication preferences from the memory context, adapt your tone accordingly.`;
}

export async function assembleContext(state: AgentState): Promise<{
  prompt: ChatPromptTemplate;
  variables: Record<string, string>;
}> {
  const prompt = ChatPromptTemplate.fromMessages([
    ["system", buildSystemPrompt(state)],
    ["human", "{humanMessage}"],
  ]);

  return {
    prompt,
    variables: { humanMessage: buildHumanPrompt(state) },
  };
}
