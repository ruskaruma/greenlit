import PageShell from "@/components/landing/PageShell";

export default function WorkflowPage() {
  return (
    <PageShell title="Workflow">
      <p className="text-sm text-[var(--muted)] leading-relaxed max-w-lg mx-auto">
        Upload script, send to client, AI detects overdue, agent drafts a chase, human reviews and approves, client receives email with one-click review link. Realtime kanban tracks everything.
      </p>
    </PageShell>
  );
}
