import { NextResponse } from "next/server";
import { ChatAnthropic } from "@langchain/anthropic";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { createServiceClientDirect } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth/requireSession";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAny = any;

const model = new ChatAnthropic({
  model: "claude-haiku-4-5-20251001",
  maxTokens: 1000,
  temperature: 0.5,
});

export async function POST(request: Request) {
  const { error: authError } = await requireSession();
  if (authError) return authError;

  const body = await request.json();
  const { report_id } = body;

  if (!report_id) {
    return NextResponse.json({ error: "report_id required" }, { status: 400 });
  }

  const supabase: SupabaseAny = createServiceClientDirect();

  const { data: report, error: reportErr } = await supabase
    .from("reports")
    .select("*, clients(name, email, company)")
    .eq("id", report_id)
    .single();

  if (reportErr || !report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  const clientName = report.clients?.name ?? "Client";
  const clientCompany = report.clients?.company ?? "";

  // Last 3 reports for this client (excluding current)
  const { data: pastReports } = await supabase
    .from("reports")
    .select("platform, content_type, content_title, metrics, previous_metrics, generated_summary, post_date, created_at")
    .eq("client_id", report.client_id)
    .neq("id", report_id)
    .order("created_at", { ascending: false })
    .limit(3);

  // Top 3 client memories
  const { data: memories } = await supabase
    .from("client_memories")
    .select("content, memory_type")
    .eq("client_id", report.client_id)
    .order("created_at", { ascending: false })
    .limit(3);

  const pastReportsContext = (pastReports ?? [])
    .map((r: Record<string, unknown>, i: number) => {
      const m = r.metrics as Record<string, number>;
      const metricsStr = Object.entries(m).map(([k, v]) => `${k}: ${v}`).join(", ");
      return `Report ${i + 1}: ${r.content_title ?? "Untitled"} (${r.platform}/${r.content_type}, ${r.post_date ?? "no date"}) — ${metricsStr}${r.generated_summary ? `\nSummary: ${r.generated_summary}` : ""}`;
    })
    .join("\n\n");

  const memoriesContext = (memories ?? [])
    .map((m: { content: string; memory_type: string }) => `[${m.memory_type}] ${m.content}`)
    .join("\n");

  const currentMetrics = report.metrics as Record<string, number>;
  const prevMetrics = report.previous_metrics as Record<string, number> | null;
  const metricsStr = Object.entries(currentMetrics)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");

  let prevMetricsStr = "";
  if (prevMetrics && Object.keys(prevMetrics).length > 0) {
    prevMetricsStr = Object.entries(prevMetrics)
      .map(([k, v]) => `${k}: ${v}`)
      .join("\n");
  }

  const systemPrompt = `You are writing a content performance evaluation for a content agency called Scrollhouse. You produce clear, data-driven reports for clients.

Rules:
- Never use em dashes. Use commas, full stops, or semicolons instead.
- No filler phrases ("I hope this finds you well", "As you know", "It's worth noting").
- Short sentences. Direct language. Data-driven.
- Oxford comma always.
- Write in second person ("your content", "you gained").
- Match the client's communication style if context is provided.
- Be specific with numbers. Reference actual metrics. Calculate percentages precisely.

Output exactly three sections:

PERFORMANCE OVERVIEW:
[2-4 sentences on what the numbers mean. Highlight standout metrics. Be specific.]

WEEK-ON-WEEK COMPARISON:
[If previous period data is provided, calculate exact % changes for each metric. Say specifically: "Reach rose 34% week on week" or "Engagement rate dropped from 4.2% to 3.1%". Flag what rose and what fell. If no previous data, write "No previous period data provided for comparison."]

RECOMMENDATIONS:
[Exactly 3 specific, actionable recommendations for the next piece of content based on what worked and what did not. Each recommendation should be one sentence.]`;

  const humanPrompt = `Generate a performance report for:

Client: ${clientName}${clientCompany ? ` (${clientCompany})` : ""}
Content: "${report.content_title ?? "Untitled"}"
Platform: ${report.platform}
Content Type: ${report.content_type}
Post URL: ${report.post_url ?? "Not provided"}
Post Date: ${report.post_date ?? "Not provided"}

Current Metrics:
${metricsStr}

${prevMetricsStr ? `Previous Period Metrics:\n${prevMetricsStr}` : "No previous period data provided."}

${pastReportsContext ? `Last reports for this client:\n${pastReportsContext}` : "No previous reports for this client."}

${memoriesContext ? `Client context from memory:\n${memoriesContext}` : "No prior client context available."}`;

  try {
    const response = await model.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(humanPrompt),
    ]);

    const content = typeof response.content === "string" ? response.content : "";

    const overviewMatch = content.match(/PERFORMANCE OVERVIEW:\s*([\s\S]*?)(?=WEEK-ON-WEEK COMPARISON:|$)/i);
    const comparisonMatch = content.match(/WEEK-ON-WEEK COMPARISON:\s*([\s\S]*?)(?=RECOMMENDATIONS:|$)/i);
    const recsMatch = content.match(/RECOMMENDATIONS:\s*([\s\S]*?)$/i);

    const overview = overviewMatch ? overviewMatch[1].trim() : content;
    const comparison = comparisonMatch ? comparisonMatch[1].trim() : "";
    const recommendations = recsMatch ? recsMatch[1].trim() : "";

    // Store overview + comparison together as generated_summary
    const fullSummary = comparison
      ? `${overview}\n\n---COMPARISON---\n${comparison}`
      : overview;

    const { error: updateErr } = await supabase
      .from("reports")
      .update({
        generated_summary: fullSummary,
        recommendations,
      })
      .eq("id", report_id);

    if (updateErr) {
      console.error("[reports] Failed to save generated summary:", updateErr.message);
    }

    return NextResponse.json({ overview, comparison, recommendations });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Generation failed";
    console.error("[reports] Claude error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
