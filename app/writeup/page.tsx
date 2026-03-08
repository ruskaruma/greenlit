import Link from "next/link";

export default function WriteupPage() {
  return (
    <div className="min-h-screen bg-[var(--bg)] px-6 py-16">
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="text-sm text-[var(--muted)] hover:text-[var(--text)] transition-colors mb-8 inline-block">&larr; Back</Link>

        <h1 className="text-4xl font-bold text-[var(--text)] mb-6 tracking-tight" style={{ fontFamily: "var(--font-playfair), serif" }}>
          Writeup
        </h1>
        <p className="text-[var(--muted)] mb-8">Coming soon.</p>
      </div>
    </div>
  );
}
