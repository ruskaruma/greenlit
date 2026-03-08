"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import ThemeToggle from "@/components/dashboard/ThemeToggle";

const links = [
  { href: "/about", label: "About Greenlit" },
  { href: "/workflow", label: "Understand Workflow" },
];

export default function Navbar() {
  return (
    <motion.nav
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bg-[var(--bg)]/80 backdrop-blur-md border-b border-[var(--border)]/50"
    >
      <Link
        href="/"
        className="text-lg font-bold tracking-tight text-[var(--text)]"
        style={{ fontFamily: "var(--font-playfair), serif" }}
      >
        Greenlit
      </Link>

      <div className="hidden md:flex items-center gap-8">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="text-[12px] uppercase tracking-[0.15em] text-[var(--muted)] hover:text-[var(--text)] transition-colors"
          >
            {l.label}
          </Link>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <ThemeToggle />
        <Link
          href="/login"
          className="px-4 py-2 rounded-lg text-xs font-bold bg-[#D4FF00] text-zinc-950 hover:bg-[#bce600] transition-colors glow-lime"
        >
          Get Started
        </Link>
      </div>
    </motion.nav>
  );
}
