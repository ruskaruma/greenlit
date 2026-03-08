"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import ThemeToggle from "@/components/dashboard/ThemeToggle";

function FloatingPaths({ position }: { position: number }) {
  const paths = Array.from({ length: 36 }, (_, i) => ({
    id: i,
    d: `M-${380 - i * 5 * position} -${189 + i * 6}C-${
      380 - i * 5 * position
    } -${189 + i * 6} -${312 - i * 5 * position} ${216 - i * 6} ${
      152 - i * 5 * position
    } ${343 - i * 6}C${616 - i * 5 * position} ${470 - i * 6} ${
      684 - i * 5 * position
    } ${875 - i * 6} ${684 - i * 5 * position} ${875 - i * 6}`,
    width: 0.5 + i * 0.03,
  }));

  return (
    <div className="absolute inset-0 pointer-events-none">
      <svg className="w-full h-full" viewBox="-400 -300 1400 1200" fill="none" preserveAspectRatio="xMidYMid slice">
        <title>Background Paths</title>
        {paths.map((path) => (
          <motion.path
            key={path.id}
            d={path.d}
            stroke="url(#hero-lime-gradient)"
            strokeWidth={path.width}
            strokeOpacity={0.06 + path.id * 0.018}
            initial={{ pathLength: 0.3, opacity: 0.6 }}
            animate={{
              pathLength: 1,
              opacity: [0.2, 0.5, 0.2],
              pathOffset: [0, 1, 0],
            }}
            transition={{
              duration: 20 + Math.random() * 10,
              repeat: Number.POSITIVE_INFINITY,
              ease: "linear",
            }}
          />
        ))}
        <defs>
          <linearGradient id="hero-lime-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#D4FF00" stopOpacity="0.7" />
            <stop offset="50%" stopColor="#00FFA3" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#D4FF00" stopOpacity="0.15" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

const spring = { type: "spring" as const, stiffness: 150, damping: 25 };

export function BackgroundPaths({ title = "Greenlit" }: { title?: string }) {
  const words = title.split(" ");

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-[var(--bg)] transition-colors duration-300">
      {/* Animated paths */}
      <div className="absolute inset-0">
        <FloatingPaths position={1} />
        <FloatingPaths position={-1} />
      </div>

      {/* Theme toggle */}
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>

      <div className="relative z-10 container mx-auto px-4 md:px-6 text-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 2 }}
          className="max-w-4xl mx-auto"
        >
          {/* Pill tag */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, ...spring }}
            className="mb-8"
          >
            <span className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-elevated)]/60 backdrop-blur-sm text-[11px] tracking-[0.15em] uppercase text-[var(--muted)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00FFA3] shadow-[0_0_6px_rgba(0,255,163,0.6)] animate-pulse" />
              AI-Powered Approval Engine
            </span>
          </motion.div>

          {/* Per-letter animated title */}
          <h1
            className="text-5xl sm:text-7xl md:text-8xl font-bold mb-5 tracking-tighter"
            style={{ fontFamily: "var(--font-playfair), serif" }}
          >
            {words.map((word, wordIndex) => (
              <span key={wordIndex} className="inline-block mr-4 last:mr-0">
                {word.split("").map((letter, letterIndex) => (
                  <motion.span
                    key={`${wordIndex}-${letterIndex}`}
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{
                      delay: wordIndex * 0.1 + letterIndex * 0.03,
                      ...spring,
                    }}
                    className="inline-block text-transparent bg-clip-text"
                    style={{
                      backgroundImage: "linear-gradient(135deg, #D4FF00 0%, #00FFA3 50%, #D4FF00 100%)",
                      WebkitBackgroundClip: "text",
                      filter: "drop-shadow(0 0 30px rgba(212, 255, 0, 0.15))",
                    }}
                  >
                    {letter}
                  </motion.span>
                ))}
              </span>
            ))}
          </h1>

          {/* Subtext */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, ...spring }}
            className="text-base md:text-lg text-[var(--muted)] mb-12 max-w-md mx-auto leading-relaxed"
          >
            AI-orchestrated video script approvals. Chase clients, not deadlines.
          </motion.p>

          {/* CTA Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, ...spring }}
          >
            <Link href="/login" className="inline-block group">
              <motion.div
                className="relative px-8 py-4 rounded-2xl font-semibold text-lg
                  bg-[#D4FF00] text-zinc-950 cursor-pointer
                  shadow-[0_0_30px_rgba(212,255,0,0.2),0_0_60px_rgba(212,255,0,0.1)]
                  hover:shadow-[0_0_40px_rgba(212,255,0,0.3),0_0_80px_rgba(212,255,0,0.15)]
                  transition-shadow duration-500"
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.98 }}
              >
                <span className="relative z-10 flex items-center gap-3">
                  Start Chasing Clients
                  <motion.span
                    className="inline-block"
                    animate={{ x: [0, 4, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                  >
                    &rarr;
                  </motion.span>
                </span>
              </motion.div>
            </Link>
          </motion.div>

          {/* Secondary info */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.0, duration: 1 }}
            className="mt-16 flex items-center justify-center gap-6 text-[11px] text-[var(--muted)] uppercase tracking-[0.2em]"
          >
            <span className="flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-[var(--muted)] opacity-40" />
              Auto-Chase
            </span>
            <span className="w-px h-3 bg-[var(--border)]" />
            <span className="flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-[var(--muted)] opacity-40" />
              HITL Review
            </span>
            <span className="w-px h-3 bg-[var(--border)]" />
            <span className="flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-[var(--muted)] opacity-40" />
              AI Scoring
            </span>
          </motion.div>

          {/* Footer */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 1 }}
            className="mt-12 text-xs text-[var(--muted)] opacity-40"
          >
            by ruskaruma &middot; for Scrollhouse
          </motion.p>
        </motion.div>
      </div>
    </div>
  );
}
