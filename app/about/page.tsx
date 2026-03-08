import PageShell from "@/components/landing/PageShell";

export default function AboutPage() {
  return (
    <PageShell title="About Greenlit">
      <p className="text-sm text-[var(--muted)] leading-relaxed max-w-lg mx-auto">
        Greenlit automates the script approval loop for Scrollhouse. AI agents chase overdue clients, draft personalized follow-ups, and queue everything for human review. No script falls through the cracks.
      </p>
    </PageShell>
  );
}
