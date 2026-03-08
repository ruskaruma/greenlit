"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { motion } from "framer-motion";

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
      <svg className="w-full h-full" viewBox="0 0 696 316" fill="none">
        <title>Background Paths</title>
        {paths.map((path) => (
          <motion.path
            key={path.id}
            d={path.d}
            stroke="url(#login-lime-gradient)"
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
          <linearGradient id="login-lime-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#D4FF00" stopOpacity="0.7" />
            <stop offset="50%" stopColor="#00FFA3" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#D4FF00" stopOpacity="0.15" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 relative bg-zinc-950 overflow-hidden">
      {/* Radial glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[500px] rounded-full bg-[#D4FF00]/[0.025] blur-[120px]" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full bg-[#00FFA3]/[0.03] blur-[80px]" />
      </div>

      {/* Animated paths */}
      <div className="absolute inset-0">
        <FloatingPaths position={1} />
        <FloatingPaths position={-1} />
      </div>

      {/* Noise overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`,
        }}
      />

      <motion.div
        className="relative z-10 w-full max-w-md flex flex-col items-center"
        variants={container}
        initial="hidden"
        animate="show"
      >
        {/* Pill tag */}
        <motion.div className="mb-8" variants={fadeUp}>
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900/60 border border-zinc-800 backdrop-blur-sm text-[11px] tracking-[0.15em] uppercase text-zinc-500">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00FFA3] shadow-[0_0_6px_rgba(0,255,163,0.6)] animate-pulse" />
            Internal Tool
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          className="text-6xl font-bold mb-4 tracking-tight"
          style={{
            fontFamily: "var(--font-playfair), serif",
            backgroundImage: "linear-gradient(135deg, #D4FF00 0%, #00FFA3 50%, #D4FF00 100%)",
            WebkitBackgroundClip: "text",
            color: "transparent",
            filter: "drop-shadow(0 0 30px rgba(212, 255, 0, 0.15))",
          }}
          variants={fadeUp}
        >
          Greenlit
        </motion.h1>

        {/* Subtext */}
        <motion.p
          className="text-sm tracking-[0.2em] uppercase text-zinc-500 mb-10"
          variants={fadeUp}
        >
          Content approval, automated.
        </motion.p>

        {/* Divider */}
        <motion.div
          className="w-full max-w-[400px] h-px bg-gradient-to-r from-transparent via-zinc-700 to-transparent mb-10 origin-center"
          variants={dividerExpand}
        />

        {/* Card */}
        <motion.div
          className="w-full max-w-[380px] bg-zinc-900/70 backdrop-blur-md rounded-2xl border border-zinc-800 p-8
            shadow-[0_0_40px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.03)]"
          variants={scaleFade}
        >
          <motion.button
            onClick={() => signIn("github", { callbackUrl })}
            className="w-full flex items-center justify-center gap-3 px-5 py-3.5 rounded-xl
              bg-[#D4FF00] text-zinc-950 text-sm font-bold
              shadow-[0_0_20px_rgba(212,255,0,0.2),0_0_40px_rgba(212,255,0,0.1)]
              hover:shadow-[0_0_30px_rgba(212,255,0,0.3),0_0_60px_rgba(212,255,0,0.15)]
              hover:-translate-y-0.5 transition-all duration-300"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
            </svg>
            Sign in with GitHub
          </motion.button>

          <p className="text-[11px] text-zinc-600 text-center mt-5">
            Access restricted to Scrollhouse team members
          </p>
        </motion.div>
      </motion.div>

      {/* Footer */}
      <p className="fixed bottom-6 left-1/2 -translate-x-1/2 text-xs text-zinc-700">
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
