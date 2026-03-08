import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface ScoreResult {
  hook_strength: number;
  cta_clarity: number;
  tone_consistency?: number;
  average: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAny = any;

export async function scoreScript({
  content,
  clientId,
  supabase,
}: {
  content: string;
  clientId: string;
  supabase: SupabaseAny;
}): Promise<ScoreResult> {
  // Check if client has memories (for tone consistency dimension)
  const { data: memories } = await supabase
    .from("client_memories")
    .select("content")
    .eq("client_id", clientId)
    .limit(5);

  const hasMemories = memories && memories.length > 0;

  const dimensions = hasMemories
    ? `1. hook_strength (1-10): How compelling is the opening hook? Does it grab attention in the first 3 seconds?
2. cta_clarity (1-10): How clear and actionable is the call-to-action? Is the viewer told exactly what to do?
3. tone_consistency (1-10): Based on the client's history below, does this script match their preferred tone and style?

Client history:
${memories.map((m: { content: string }) => `- ${m.content}`).join("\n")}`
    : `1. hook_strength (1-10): How compelling is the opening hook? Does it grab attention in the first 3 seconds?
2. cta_clarity (1-10): How clear and actionable is the call-to-action? Is the viewer told exactly what to do?

Note: No client history available, so skip tone_consistency.`;

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 200,
    messages: [
      {
        role: "user",
        content: `Score this video script on the following dimensions. Return ONLY valid JSON, no other text.

Script:
"""
${content.slice(0, 3000)}
"""

Dimensions:
${dimensions}

Return JSON format:
${hasMemories
  ? `{"hook_strength": N, "cta_clarity": N, "tone_consistency": N}`
  : `{"hook_strength": N, "cta_clarity": N}`}

JSON:`,
      },
    ],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  const parsed = JSON.parse(text.trim());

  const scores: number[] = [parsed.hook_strength, parsed.cta_clarity];
  if (hasMemories && parsed.tone_consistency !== undefined) {
    scores.push(parsed.tone_consistency);
  }

  const average = Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;

  const result: ScoreResult = {
    hook_strength: parsed.hook_strength,
    cta_clarity: parsed.cta_clarity,
    average,
  };

  if (hasMemories && parsed.tone_consistency !== undefined) {
    result.tone_consistency = parsed.tone_consistency;
  }

  return result;
}
