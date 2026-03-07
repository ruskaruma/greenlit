import { createServiceClientDirect } from "@/lib/supabase/server";
import StatusBadge from "@/components/ui/StatusBadge";
import ReviewActions from "@/components/review/ReviewActions";
import { formatStatus } from "@/lib/utils";
import { format } from "date-fns";
import { Check, RotateCcw, X, Clock } from "lucide-react";
import type { ScriptStatus } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAny = any;

interface ScriptData {
  id: string;
  title: string;
  content: string;
  status: ScriptStatus;
  review_token: string;
  client_feedback: string | null;
  due_date: string | null;
  expires_at: string | null;
  reviewed_at: string | null;
  client: { name: string; company: string | null } | null;
}

async function getScript(token: string): Promise<ScriptData | null> {
  const supabase: SupabaseAny = createServiceClientDirect();

  const { data, error } = await supabase
    .from("scripts")
    .select("id, title, content, status, review_token, client_feedback, due_date, expires_at, reviewed_at, client:clients(name, company)")
    .eq("review_token", token)
    .single();

  if (error || !data) return null;
  return data as ScriptData;
}

function AlreadyReviewed({ status, clientName }: { status: ScriptStatus; clientName: string }) {
  const icon =
    status === "approved" ? <Check size={28} className="text-[#00ff88]" /> :
    status === "changes_requested" ? <RotateCcw size={28} className="text-orange-400" /> :
    <X size={28} className="text-red-400" />;

  const bgColor =
    status === "approved" ? "bg-[#00ff88]/10" :
    status === "changes_requested" ? "bg-orange-500/10" :
    "bg-red-500/10";

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-6 ${bgColor}`}>
        {icon}
      </div>
      <h2 className="text-xl font-semibold text-[var(--text)] mb-2">
        Already reviewed
      </h2>
      <p className="text-sm text-[var(--muted)] max-w-sm">
        {clientName}, you marked this script as{" "}
        <span className="text-[var(--text)] opacity-80">{formatStatus(status).toLowerCase()}</span>.
        No further action needed.
      </p>
    </div>
  );
}

function ExpiredLink() {
  return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center p-6 transition-colors duration-300">
      <div className="text-center max-w-sm">
        <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
          <Clock size={20} className="text-amber-400" />
        </div>
        <h1 className="text-lg font-semibold text-[var(--text)] mb-2">Review link expired</h1>
        <p className="text-sm text-[var(--muted)]">
          This review link has expired. Please contact the team to request a new one.
        </p>
      </div>
    </div>
  );
}

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const script = await getScript(token);

  if (!script) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center p-6 transition-colors duration-300">
        <div className="text-center max-w-sm">
          <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <X size={20} className="text-red-400" />
          </div>
          <h1 className="text-lg font-semibold text-[var(--text)] mb-2">Invalid review link</h1>
          <p className="text-sm text-[var(--muted)]">
            This review link is invalid or has expired.
            Please contact the team if you believe this is an error.
          </p>
        </div>
      </div>
    );
  }

  // Check expiry
  if (script.expires_at && new Date(script.expires_at) < new Date()) {
    return <ExpiredLink />;
  }

  const clientName = script.client?.name ?? "there";
  const isReviewed =
    script.status === "approved" ||
    script.status === "rejected" ||
    script.status === "changes_requested";

  return (
    <div className="min-h-screen bg-[var(--bg)] transition-colors duration-300">
      {/* Top bar */}
      <header className="border-b border-[var(--border)]">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-[var(--muted)]">
              Greenlit for Scrollhouse
              <span className="opacity-40"> &middot; </span>
              by ruskaruma
            </span>
          </div>
          <StatusBadge status={script.status} />
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {isReviewed ? (
          <AlreadyReviewed status={script.status} clientName={clientName} />
        ) : (
          <>
            <div className="mb-6 sm:mb-8">
              <h1 className="text-xl sm:text-2xl font-semibold text-[var(--text)] tracking-tight mb-3">
                {script.title}
              </h1>
              <p className="text-sm text-[var(--muted)]">
                Hi {clientName}, please review this script and let us know your thoughts.
              </p>
            </div>

            <div className="h-px bg-[var(--border)] mb-6 sm:mb-8" />

            <div className="mb-6">
              <p className="text-[10px] uppercase tracking-widest text-[var(--muted)] opacity-50 mb-2">Script Content</p>
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-4 sm:p-6 max-h-[500px] overflow-y-auto">
                <pre className="font-mono text-sm text-[var(--text)] opacity-80 whitespace-pre-wrap leading-relaxed">
                  {script.content}
                </pre>
              </div>
            </div>

            {script.due_date && (
              <p className="text-xs text-[var(--muted)] opacity-60 mb-6 sm:mb-8">
                Due by {format(new Date(script.due_date), "MMMM d, yyyy")}
              </p>
            )}

            <div className="h-px bg-[var(--border)] mb-6 sm:mb-8" />

            <div>
              <p className="text-[10px] uppercase tracking-widest text-[var(--muted)] opacity-50 mb-3">Your Review</p>
              <ReviewActions token={token} />
            </div>
          </>
        )}
      </main>

      <footer className="border-t border-[var(--border)] mt-16">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
          <p className="text-[11px] text-[var(--muted)] opacity-40">
            This is a secure review link. Do not share it with others.
          </p>
        </div>
      </footer>
    </div>
  );
}
