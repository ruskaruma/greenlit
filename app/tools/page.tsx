import Link from "next/link";

const sections = [
  {
    title: "Frontend",
    items: [
      { name: "Next.js 16", note: "App Router, React Server Components, middleware auth" },
      { name: "React 19", note: "Concurrent features, server actions" },
      { name: "Tailwind CSS v4", note: "CSS-variable theming, @theme inline, dark mode" },
      { name: "Framer Motion", note: "Layout animations, spring physics, staggered entrances" },
      { name: "shadcn/ui", note: "Badge, Button components with CVA variants" },
    ],
  },
  {
    title: "Backend & Data",
    items: [
      { name: "Supabase", note: "Postgres database, Realtime subscriptions for live Kanban updates" },
      { name: "NextAuth.js", note: "GitHub OAuth, JWT sessions, middleware-protected routes" },
      { name: "Server-Sent Events", note: "Real-time agent progress streaming to the browser" },
    ],
  },
  {
    title: "AI & Agent Tools",
    items: [
      { name: "Claude AI (Anthropic)", note: "Haiku for quality scoring, Sonnet for draft generation and tone adaptation" },
      { name: "Autonomous Agent", note: "Multi-step chase pipeline with configurable escalation schedules" },
      { name: "Human-in-the-Loop", note: "Every AI draft requires human approval before client delivery" },
      { name: "Quality Scorer", note: "3-dimension analysis: hook strength, CTA clarity, tone consistency" },
    ],
  },
  {
    title: "Communication",
    items: [
      { name: "Resend", note: "Transactional email delivery for script approvals and chases" },
      { name: "Twilio", note: "WhatsApp Business API for client messaging" },
    ],
  },
];

export default function ToolsPage() {
  return (
    <div className="min-h-screen bg-[var(--bg)] px-6 py-16">
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="text-sm text-[var(--muted)] hover:text-[var(--text)] transition-colors mb-8 inline-block">&larr; Back</Link>

        <h1 className="text-4xl font-bold text-[var(--text)] mb-3 tracking-tight" style={{ fontFamily: "var(--font-playfair), serif" }}>
          Tools Used
        </h1>
        <p className="text-[var(--muted)] mb-12 max-w-lg leading-relaxed">
          The full stack behind Greenlit, from frontend to AI agent tooling.
        </p>

        {sections.map((s) => (
          <div key={s.title} className="mb-10">
            <h2 className="text-lg font-semibold text-[var(--text)] mb-4 border-b border-[var(--border)] pb-2">{s.title}</h2>
            <div className="space-y-3">
              {s.items.map((item) => (
                <div key={item.name} className="flex gap-3">
                  <span className="text-sm font-medium text-[var(--text)] shrink-0 w-44">{item.name}</span>
                  <span className="text-sm text-[var(--muted)]">{item.note}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
