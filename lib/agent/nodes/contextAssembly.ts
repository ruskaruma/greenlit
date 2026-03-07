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

  const sentDate = formatReadableDate(state.sentAt);
  const dueDate = state.dueDate ? formatReadableDate(state.dueDate) : null;
  const dueLine = dueDate ? `\nThe review deadline is ${dueDate}.` : "";

  return `You are a professional account manager at Scrollhouse, a content agency.
You write follow-up emails to clients who haven't reviewed scripts we sent them.
Your tone is professional but warm. Never be pushy or guilt-tripping.
Keep emails under 150 words. Include a subject line.${toneGuide}

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

  const memoryContext = state.clientMemories.length > 0
    ? `\nWhat we know about this client from past interactions:\n${state.clientMemories.map((m, i) => `${i + 1}. ${m}`).join("\n")}`
    : "\nThis is a new client with no prior interaction history.";

  return `Write a follow-up email for this situation:

Client: ${state.clientName}
Script: "${state.scriptTitle}"
Script preview: ${contentPreview}
Sent ${state.hoursOverdue} hours ago with no response.
${memoryContext}

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
