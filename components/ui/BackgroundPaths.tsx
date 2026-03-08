"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

const paths = [
  "M0 300 Q400 200 800 350 T1600 280",
  "M0 500 Q350 400 700 480 T1400 420",
  "M0 150 Q500 250 900 100 T1800 200",
  "M0 650 Q300 550 600 700 T1200 580",
  "M0 400 Q450 350 850 430 T1700 350",
];

const spring = { type: "spring" as const, stiffness: 200, damping: 30 };

const container = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.2,
    },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: spring },
};

export default function BackgroundPaths() {
  return (
    <div className="relative min-h-screen bg-[var(--bg)] overflow-hidden flex items-center justify-center">
      {/* Floating SVG paths */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 1600 800"
        preserveAspectRatio="none"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {paths.map((d, i) => (
          <motion.path
            key={i}
            d={d}
            stroke="currentColor"
            strokeWidth={1}
            className="text-[var(--border)]"
            style={{ opacity: 0.5 }}
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{
              pathLength: 1,
              opacity: [0.03, 0.08, 0.03],
              translateY: [0, -15, 0],
            }}
            transition={{
              pathLength: { duration: 2, delay: i * 0.3, ease: "easeInOut" },
              opacity: { duration: 6 + i, repeat: Infinity, ease: "easeInOut" },
              translateY: { duration: 7 + i * 0.5, repeat: Infinity, ease: "easeInOut" },
            }}
          />
        ))}
      </svg>

      {/* Content */}
      <motion.div
        className="relative z-10 flex flex-col items-center text-center px-6"
        variants={container}
        initial="hidden"
        animate="show"
      >
        <motion.div className="mb-6" variants={fadeUp}>
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[var(--border)] text-[11px] tracking-[0.15em] uppercase text-[var(--muted)]">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-success)]" />
            AI-Powered Approval Engine
          </span>
        </motion.div>

        <motion.h1
          className="text-6xl md:text-7xl font-bold text-[var(--text)] mb-5 tracking-tight"
          style={{ fontFamily: "var(--font-playfair), serif" }}
          variants={fadeUp}
        >
          Greenlit
        </motion.h1>

        <motion.p
          className="text-base md:text-lg text-[var(--muted)] mb-10 max-w-md leading-relaxed"
          variants={fadeUp}
        >
          AI-orchestrated video script approvals. Chase clients, not deadlines.
        </motion.p>

        <motion.div variants={fadeUp}>
          <Link
            href="/login"
            className="group inline-flex items-center gap-2.5 px-6 py-3 rounded-lg border border-[var(--accent-primary)] text-[var(--accent-primary)] text-sm font-semibold tracking-wide hover:bg-[var(--accent-primary)] hover:text-zinc-950 glow-lime"
          >
            Start Chasing Clients
            <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </motion.div>

        <motion.p
          className="mt-16 text-xs text-[var(--muted)] opacity-40"
          variants={fadeUp}
        >
          by ruskaruma &middot; for Scrollhouse
        </motion.p>
      </motion.div>
    </div>
  );
}
