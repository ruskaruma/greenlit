"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { motion } from "framer-motion";
import ThemeToggle from "@/components/dashboard/ThemeToggle";

const spring = { type: "spring" as const, stiffness: 300, damping: 30 };

const container = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.1,
    },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: spring },
};

const scaleFade = {
  hidden: { opacity: 0, scale: 0.95 },
  show: { opacity: 1, scale: 1, transition: spring },
};

const dividerExpand = {
  hidden: { opacity: 0, scaleX: 0 },
  show: { opacity: 1, scaleX: 1, transition: { ...spring, delay: 0.55 } },
};

function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 relative bg-[var(--bg)] transition-colors duration-300 overflow-hidden">
      {/* Simple static decorative circles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full border border-[#D4FF00]/[0.06]" />
        <div className="absolute -bottom-32 -left-32 w-[400px] h-[400px] rounded-full border border-[#00FFA3]/[0.05]" />
      </div>

      {/* Theme toggle */}
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>

      <motion.div
        className="relative z-10 w-full max-w-md flex flex-col items-center"
        variants={container}
        initial="hidden"
        animate="show"
      >
        {/* Pill tag */}
        <motion.div className="mb-8" variants={fadeUp}>
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--surface-elevated)]/60 border border-[var(--border)] text-[11px] tracking-[0.15em] uppercase text-[var(--muted)]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00FFA3] shadow-[0_0_6px_rgba(0,255,163,0.6)] animate-pulse" />
            Internal Tool
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          className="text-6xl font-bold mb-4 tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-[#D4FF00] to-[#00FFA3]"
          style={{ fontFamily: "var(--font-playfair), serif" }}
          variants={fadeUp}
        >
          Greenlit
        </motion.h1>

        {/* Subtext */}
        <motion.p
          className="text-sm tracking-[0.2em] uppercase text-[var(--muted)] mb-10"
          variants={fadeUp}
        >
          Content approval, automated.
        </motion.p>

        {/* Divider */}
        <motion.div
          className="w-full max-w-[400px] h-px bg-gradient-to-r from-transparent via-[var(--border)] to-transparent mb-10 origin-center"
          variants={dividerExpand}
        />

        {/* Card */}
        <motion.div
          className="w-full max-w-[380px] bg-[var(--card)] backdrop-blur-md rounded-2xl border border-[var(--border)] p-8 shadow-lg"
          variants={scaleFade}
        >
          <motion.button
            onClick={() => signIn("github", { callbackUrl })}
            className="w-full flex items-center justify-center gap-3 px-5 py-3.5 rounded-xl bg-[#FAFF00] text-zinc-950 text-sm font-bold hover:-translate-y-0.5 transition-transform duration-200"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
            </svg>
            Sign in with GitHub
          </motion.button>

          <p className="text-[11px] text-[var(--muted)] text-center mt-5 opacity-60">
            Access restricted to Scrollhouse team members
          </p>
        </motion.div>
      </motion.div>

      {/* Footer */}
      <p className="fixed bottom-6 left-1/2 -translate-x-1/2 text-xs text-[var(--muted)] opacity-60">
        by ruskaruma
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
