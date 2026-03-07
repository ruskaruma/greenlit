// To test manually after deploy, run:
// curl -X GET https://greenlit.ruskaruma.me/api/agent/run -H 'Authorization: Bearer greenlit-cron-2026'

import { NextResponse } from "next/server";
import { createServiceClientDirect } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth/requireSession";
import { runChaserForScript } from "@/lib/agent/graph";
import type { AgentState } from "@/lib/agent/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAny = any;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function GET(request: Request) {
  // Dual auth: Bearer CRON_SECRET OR valid NextAuth session
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  let authorized = false;

  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    authorized = true;
  }

  if (!authorized) {
    const { error: authError } = await requireSession();
    if (!authError) {
      authorized = true;
    }
  }

  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase: SupabaseAny = createServiceClientDirect();

  try {
    // Step 1: Find all overdue scripts (pending_review, past due_date, actually sent)
    const now = new Date().toISOString();

    const { data: overdueScripts, error: queryError } = await supabase
      .from("scripts")
      .select("id, title, content, client_id, sent_at, due_date, clients(id, name, email)")
      .eq("status", "pending_review")
      .lt("due_date", now)
      .not("sent_at", "is", null)
      .order("due_date", { ascending: true });

    if (queryError) {
      console.error("[agent/run] Overdue query failed:", queryError.message);
      return NextResponse.json({ error: queryError.message }, { status: 500 });
    }

    if (!overdueScripts || overdueScripts.length === 0) {
      console.log("[agent/run] No overdue scripts found");
      return NextResponse.json({ updated: 0, scriptIds: [] });
    }

    const scriptIds = overdueScripts.map((s: { id: string }) => s.id);
    console.log(`[agent/run] Found ${scriptIds.length} overdue scripts: ${scriptIds.join(", ")}`);

    // Step 2: Batch update all to 'overdue' status
    const { error: updateError } = await supabase
      .from("scripts")
      .update({ status: "overdue", updated_at: new Date().toISOString() })
      .in("id", scriptIds);

    if (updateError) {
      console.error("[agent/run] Batch update failed:", updateError.message);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    console.log(`[agent/run] Batch updated ${scriptIds.length} scripts to 'overdue'`);

    // Step 3: Run chaser agent for each — sequentially with 500ms delay
    const errors: string[] = [];
    let processed = 0;

    for (let i = 0; i < overdueScripts.length; i++) {
      const script = overdueScripts[i];
      const client = script.clients;

      if (!client) {
        errors.push(`Script ${script.id}: no client found`);
        continue;
      }

      const sentDate = new Date(script.sent_at);
      const hoursOverdue = Math.round(
        (Date.now() - sentDate.getTime()) / (1000 * 60 * 60)
      );

      const agentState: AgentState = {
        scriptId: script.id,
        clientId: client.id,
        clientEmail: client.email,
        clientName: client.name,
        scriptTitle: script.title,
        scriptContent: script.content,
        sentAt: script.sent_at,
        dueDate: script.due_date ?? null,
        hoursOverdue,
        clientMemories: [],
        generatedEmail: null,
        emailSubject: null,
        chaserId: null,
        error: null,
        urgencyScore: null,
        toneRecommendation: null,
        critiqueScores: null,
        revisionCount: 0,
        nodeExecutionLog: [],
      };

      try {
        console.log(`[agent/run] Processing script ${i + 1}/${overdueScripts.length}: ${script.id} (${script.title})`);
        const result = await runChaserForScript(agentState);

        if (result.error) {
          errors.push(`Script ${script.id}: ${result.error}`);
        } else {
          processed++;
          console.log(`[agent/run] Chaser generated for script ${script.id}`);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        errors.push(`Script ${script.id}: ${msg}`);
        console.error(`[agent/run] Agent failed for script ${script.id}:`, msg);
      }

      // 500ms delay between agent runs to avoid rate limits
      if (i < overdueScripts.length - 1) {
        await sleep(500);
      }
    }

    console.log(`[agent/run] Done. Processed ${processed}/${overdueScripts.length}, errors: ${errors.length}`);

    return NextResponse.json({
      updated: scriptIds.length,
      scriptIds,
      agentResults: { processed, errors },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Agent execution failed";
    console.error("[agent/run] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
