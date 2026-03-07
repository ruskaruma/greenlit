import { ChatPromptTemplate } from "@langchain/core/prompts";
import type { AgentState } from "../types";

function formatReadableDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric" });
}

function buildSystemPrompt(state: AgentState): string {
  const daysOverdue = Math.round(state.hoursOverdue / 24);
  const sentDate = formatReadableDate(state.sentAt);
  const dueDate = state.dueDate ? formatReadableDate(state.dueDate) : null;
  const dueLine = dueDate ? `\nThe review deadline was ${dueDate}.` : "";

  const toneGuide = state.toneRecommendation
    ? `\nSentiment analysis recommends: ${state.toneRecommendation} tone.`
    : "";

  const memoryContext = state.clientMemories.length > 0
    ? state.clientMemories.map(m => `- ${m}`).join("\n")
    : "- No previous interactions on record.";

  return `You are a professional email writer for Scrollhouse, a video content agency. Write chaser emails that follow these rules without exception:

TONE & STYLE:
- Professional but warm. Never overly formal, never casual.
- Short sentences. Short paragraphs. Maximum 3 lines per paragraph.
- Never use em dashes. Use commas or full stops instead.
- No emojis. No exclamation marks unless absolutely necessary.
- Never start with "Hope you're doing well" or any variation of it.
- Never say "as per my last email", "just circling back", "just checking in", "touching base".
- Get to the point in the first sentence.

STRUCTURE:
- Line 1: Reference the script by name and when it was sent.
- Line 2-3: One specific thing you liked about the script (use the script content provided).
- Line 4-5: Clear ask. What you need from them and by when.
- Sign off: "Best, Scrollhouse Team"

GRAMMAR:
- Oxford comma always.
- Never end a sentence with a preposition.
- Spell out numbers under ten.
- No passive voice.

CONTEXT:
Client: ${state.clientName}
Script: "${state.scriptTitle}" — ${daysOverdue} days overdue
Sent on: ${sentDate}${dueLine}${toneGuide}

What you know about this client:
${memoryContext}

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
