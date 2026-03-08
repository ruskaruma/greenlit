"use client";

import Link from "next/link";

export default function Footer() {
  return (
    <footer className="py-8 px-6 border-t border-[var(--border)] bg-[var(--bg)]">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-xs text-[var(--muted)]">
          by ruskaruma &middot; for Scrollhouse
        </p>
        <div className="flex items-center gap-6">
          <Link href="/about" className="text-xs text-[var(--muted)] hover:text-[var(--text)] transition-colors">
            About
          </Link>
          <Link href="/workflow" className="text-xs text-[var(--muted)] hover:text-[var(--text)] transition-colors">
            Workflow
          </Link>
        </div>
      </div>
    </footer>
  );
}
