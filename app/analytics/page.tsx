import { BarChart3 } from "lucide-react";
import Link from "next/link";

export default function AnalyticsPage() {
  return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
      <div className="text-center max-w-sm">
        <div className="w-12 h-12 rounded-full bg-[var(--surface-elevated)] border border-[var(--border)] flex items-center justify-center mx-auto mb-4">
          <BarChart3 size={20} className="text-[var(--muted)]" />
        </div>
        <h1 className="text-lg font-semibold text-[var(--text)] mb-2">Analytics</h1>
        <p className="text-sm text-[var(--muted)] mb-6">
          Response times, approval rates, and client engagement metrics. Coming soon.
        </p>
        <Link
          href="/dashboard"
          className="text-xs text-[var(--text)] border border-[var(--border)] px-3 py-1.5 rounded hover:bg-[var(--surface-elevated)]"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
