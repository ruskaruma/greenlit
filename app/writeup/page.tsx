import PageShell from "@/components/landing/PageShell";

export default function WriteupPage() {
  return (
    <PageShell title="Writeup">
      <p className="text-sm text-[var(--muted)] leading-relaxed max-w-lg mx-auto">
        Full project writeup covering problem selection, architecture, time saved, and what comes next. Read the detailed breakdown on Notion.
      </p>
    </PageShell>
  );
}
