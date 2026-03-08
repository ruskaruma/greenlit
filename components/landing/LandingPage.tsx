"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Bot, ShieldCheck, BarChart3 } from "lucide-react";
import ThemeToggle from "@/components/dashboard/ThemeToggle";

const words = ["AI-POWERED", "SCRIPT", "APPROVAL", "ENGINE"];

const features = [
  {
    icon: Bot,
    title: "AI Agent",
    desc: "Autonomous email and WhatsApp chasing with configurable escalation schedules and tone adaptation.",
  },
  {
    icon: ShieldCheck,
    title: "Human-in-the-Loop",
    desc: "Review and approve every AI-drafted message before it reaches your client. Full control, zero surprises.",
  },
  {
    icon: BarChart3,
    title: "Quality Scoring",
    desc: "Claude-powered script analysis across hook strength, CTA clarity, and tone consistency.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[var(--bg)] flex flex-col">
      <nav className="flex items-center justify-between px-6 md:px-10 py-4 shrink-0">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-[var(--accent-primary)] flex items-center justify-center">
            <span className="text-white text-xs font-bold">G</span>
          </div>
          <span className="text-sm font-semibold text-[var(--text)] tracking-wide">Greenlit</span>
        </Link>
        <div className="hidden md:flex items-center gap-8">
          <Link href="/about" className="text-[11px] uppercase tracking-[0.1em] text-[var(--muted)] hover:text-[var(--text)] transition-colors">About</Link>
          <Link href="/tools" className="text-[11px] uppercase tracking-[0.1em] text-[var(--muted)] hover:text-[var(--text)] transition-colors">Tools</Link>
          <Link href="/workflow" className="text-[11px] uppercase tracking-[0.1em] text-[var(--muted)] hover:text-[var(--text)] transition-colors">Workflow</Link>
          <Link href="/writeup" className="text-[11px] uppercase tracking-[0.1em] text-[var(--muted)] hover:text-[var(--text)] transition-colors">Writeup</Link>
          <Link href="https://github.com/ruskaruma/greenlit" target="_blank" className="text-[var(--muted)] hover:text-[var(--text)] transition-colors">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <button onClick={() => signIn("github", { callbackUrl: "/dashboard" })} className="px-4 py-1.5 rounded-md text-[11px] font-semibold tracking-wide border border-[var(--accent-primary)] text-[var(--accent-primary)] hover:bg-[var(--accent-primary)] hover:text-white transition-colors cursor-pointer">
            GET STARTED
          </button>
        </div>
      </nav>

      <main className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="max-w-5xl mx-auto w-full">
          <div className="text-center mb-12 md:mb-16">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-8"
            >
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[var(--border)] text-[11px] tracking-[0.12em] uppercase text-[var(--muted)]">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)]" />
                Built for Scrollhouse
              </span>
            </motion.div>

            <h1 className="mb-6">
              {words.map((word, i) => (
                <motion.span
                  key={word}
                  initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  transition={{ delay: 0.15 + i * 0.1, duration: 0.5 }}
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
              transition={{ delay: 0.6, duration: 0.5 }}
              className="text-sm md:text-base text-[var(--muted)] mb-8 max-w-xl mx-auto leading-relaxed italic"
            >
              AI-orchestrated video script approvals with autonomous chasing,
              human-in-the-loop review, and quality scoring.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.75, duration: 0.4 }}
              className="flex items-center justify-center gap-3 mb-8 flex-wrap"
            >
              {["AUTO-CHASE", "HITL REVIEW", "AI SCORING"].map((b) => (
                <span key={b} className="px-3 py-1 rounded-full border border-[var(--border)] text-[10px] tracking-[0.1em] uppercase text-[var(--muted)]">
                  {b}
                </span>
              ))}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9, duration: 0.4 }}
            >
              <motion.button
                onClick={() => signIn("github", { callbackUrl: "/dashboard" })}
                className="px-8 py-3.5 rounded-xl font-semibold text-base bg-[var(--accent-primary)] text-white cursor-pointer glow-primary"
                whileHover={{ scale: 1.03, y: -1 }}
                whileTap={{ scale: 0.98 }}
              >
                use greenlit
              </motion.button>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1, duration: 0.5 }}
            className="text-center mb-6"
          >
            <h2
              className="text-2xl md:text-3xl font-bold text-[var(--text)] mb-2 tracking-tight italic"
              style={{ fontFamily: "var(--font-playfair), serif" }}
            >
              Unlock Automated Approvals
            </h2>
            <p className="text-sm text-[var(--muted)]">Everything you need to get scripts approved faster.</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2, duration: 0.5 }}
            className="grid md:grid-cols-3 gap-4"
          >
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.3 + i * 0.08, duration: 0.4 }}
                className="p-5 rounded-xl bg-[var(--card)] border border-[var(--border)]"
              >
                <div className="w-9 h-9 rounded-lg border border-[var(--accent-primary)]/30 bg-[var(--accent-primary)]/5 flex items-center justify-center mb-4">
                  <f.icon size={18} className="text-[var(--accent-primary)]" />
                </div>
                <h3 className="text-sm font-semibold text-[var(--text)] mb-2">{f.title}</h3>
                <p className="text-xs text-[var(--muted)] leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </main>

      <footer className="py-4 text-center shrink-0">
        <p className="text-[11px] text-[var(--muted)] opacity-50">by ruskaruma &middot; for Scrollhouse</p>
      </footer>
    </div>
  );
}
