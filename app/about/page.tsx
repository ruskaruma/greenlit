import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center px-6">
      <div className="text-center max-w-lg">
        <h1
          className="text-4xl font-bold text-[var(--text)] mb-4 tracking-tight"
          style={{ fontFamily: "var(--font-playfair), serif" }}
        >
          About Greenlit
        </h1>
        <p className="text-[var(--muted)] mb-8">Coming soon.</p>
        <Link
          href="/"
          className="text-sm text-[#D4FF00] hover:underline"
        >
          &larr; Back to home
        </Link>
      </div>
    </div>
  );
}
