import Link from "next/link";

export default function WorkflowPage() {
  return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center px-6">
      <div className="text-center max-w-lg">
        <h1
          className="text-4xl font-bold text-[var(--text)] mb-4 tracking-tight"
          style={{ fontFamily: "var(--font-playfair), serif" }}
        >
          Understand Workflow
        </h1>
        <p className="text-[var(--muted)] mb-8">Coming soon.</p>
        <Link
          href="/"
          className="text-sm text-[var(--accent-primary)] hover:underline"
        >
          &larr; Back to home
        </Link>
      </div>
    </div>
  );
}
