import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[var(--bg)] px-6 py-16">
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="text-sm text-[var(--muted)] hover:text-[var(--text)] transition-colors mb-8 inline-block">&larr; Back</Link>

        <h1 className="text-4xl font-bold text-[var(--text)] mb-6 tracking-tight" style={{ fontFamily: "var(--font-playfair), serif" }}>
          About Greenlit
        </h1>

        <div className="space-y-6 text-[var(--text)] leading-relaxed">
          <p>
            Greenlit is an AI-orchestrated script approval engine built for Scrollhouse, a video production agency.
          </p>
          <p>
            The problem: getting clients to approve video scripts is slow. It involves endless email threads, WhatsApp follow-ups, and manual tracking. Scripts sit in limbo for days.
          </p>
          <p>
            Greenlit fixes this by automating the entire chase cycle. When a script is uploaded, the AI agent drafts personalized follow-up messages, scores the script quality, and queues everything for human review before anything is sent.
          </p>

          <h2 className="text-xl font-semibold pt-4">How it works</h2>
          <ul className="space-y-2 text-[var(--muted)]">
            <li>Upload a script and assign it to a client</li>
            <li>AI scores the script on hook strength, CTA clarity, and tone</li>
            <li>Agent drafts chase messages (email + WhatsApp) with escalating urgency</li>
            <li>Human reviews and approves every message before delivery</li>
            <li>Client receives the message, responds, and the loop continues</li>
            <li>Real-time Kanban board tracks everything across all scripts</li>
          </ul>

          <h2 className="text-xl font-semibold pt-4">Key decisions</h2>
          <ul className="space-y-2 text-[var(--muted)]">
            <li>Human-in-the-loop by default. No AI message goes out without approval.</li>
            <li>SSE for real-time agent progress instead of polling.</li>
            <li>Supabase Realtime for instant Kanban updates across tabs.</li>
            <li>Quality scoring runs synchronously on upload so you see issues immediately.</li>
          </ul>
        </div>

        <p className="text-xs text-[var(--muted)] opacity-50 mt-16">by ruskaruma &middot; for Scrollhouse</p>
      </div>
    </div>
  );
}
