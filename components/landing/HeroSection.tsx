"use client";

import { motion } from "framer-motion";
import Link from "next/link";

const words = ["AI-POWERED", "SCRIPT", "APPROVAL", "ENGINE"];

const badges = [
  { label: "Auto-Chase", icon: "M" },
  { label: "HITL Review", icon: "H" },
  { label: "AI Scoring", icon: "S" },
];

export default function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center pt-16 bg-[var(--bg)]">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-20 -left-20 w-[600px] h-[600px] rounded-full border border-[#D4FF00]/[0.05]" />
        <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] rounded-full border border-[#00FFA3]/[0.04]" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="mb-8"
        >
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[var(--border)] text-[11px] tracking-[0.15em] uppercase text-[var(--muted)]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00FFA3] animate-pulse" />
            Built for Scrollhouse
          </span>
        </motion.div>

        <h1 className="mb-6">
          {words.map((word, i) => (
            <motion.span
              key={word}
              initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ delay: 0.3 + i * 0.12, duration: 0.6 }}
              className="inline-block mr-3 md:mr-5 text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-[var(--text)]"
              style={{ fontFamily: "var(--font-playfair), serif" }}
            >
              {word}
            </motion.span>
          ))}
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.6 }}
          className="text-base md:text-lg text-[var(--muted)] mb-8 max-w-lg mx-auto leading-relaxed"
        >
          AI-orchestrated video script approvals with autonomous chasing,
          human-in-the-loop review, and quality scoring.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1, duration: 0.5 }}
          className="flex items-center justify-center gap-3 mb-10 flex-wrap"
        >
          {badges.map((b) => (
            <span
              key={b.label}
              className="px-3 py-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-elevated)] text-[11px] tracking-wide uppercase text-[var(--muted)]"
            >
              {b.label}
            </span>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.3, duration: 0.5 }}
        >
          <Link href="/login" className="inline-block">
            <motion.div
              className="px-8 py-4 rounded-2xl font-semibold text-lg bg-[#D4FF00] text-zinc-950 cursor-pointer glow-lime"
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              Start Chasing Clients &rarr;
            </motion.div>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
