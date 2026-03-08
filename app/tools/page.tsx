import PageShell from "@/components/landing/PageShell";

export default function ToolsPage() {
  return (
    <PageShell title="Tools Used">
      <p className="text-sm text-[var(--muted)] leading-relaxed max-w-lg mx-auto">
        Next.js 16, React 19, Tailwind v4, Supabase Realtime, Claude AI for scoring and draft generation, Resend for email, Twilio for WhatsApp, Framer Motion for animations. Full stack, no shortcuts.
      </p>
    </PageShell>
  );
}
