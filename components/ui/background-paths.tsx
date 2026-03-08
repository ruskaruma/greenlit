"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import Link from "next/link";

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
            <svg
                className="w-full h-full"
                viewBox="0 0 696 316"
                fill="none"
            >
                <title>Background Paths</title>
                {paths.map((path) => (
                    <motion.path
                        key={path.id}
                        d={path.d}
                        stroke="url(#lime-gradient)"
                        strokeWidth={path.width}
                        strokeOpacity={0.04 + path.id * 0.015}
                        initial={{ pathLength: 0.3, opacity: 0.6 }}
                        animate={{
                            pathLength: 1,
                            opacity: [0.15, 0.4, 0.15],
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
                    <linearGradient id="lime-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#D4FF00" stopOpacity="0.6" />
                        <stop offset="50%" stopColor="#00FFA3" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#D4FF00" stopOpacity="0.1" />
                    </linearGradient>
                </defs>
            </svg>
        </div>
    );
}

export function BackgroundPaths({
    title = "Greenlit",
}: {
    title?: string;
}) {
    const words = title.split(" ");

    return (
        <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-[var(--bg)]">
            <div className="absolute inset-0">
                <FloatingPaths position={1} />
                <FloatingPaths position={-1} />
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
                        transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 30 }}
                        className="mb-8"
                    >
                        <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[var(--border)] text-[11px] tracking-[0.15em] uppercase text-[var(--muted)]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#00FFA3] animate-pulse" />
                            AI-Powered Approval Engine
                        </span>
                    </motion.div>

                    {/* Per-letter animated title */}
                    <h1 className="text-5xl sm:text-7xl md:text-8xl font-bold mb-4 tracking-tighter" style={{ fontFamily: "var(--font-playfair), serif" }}>
                        {words.map((word, wordIndex) => (
                            <span
                                key={wordIndex}
                                className="inline-block mr-4 last:mr-0"
                            >
                                {word.split("").map((letter, letterIndex) => (
                                    <motion.span
                                        key={`${wordIndex}-${letterIndex}`}
                                        initial={{ y: 100, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        transition={{
                                            delay:
                                                wordIndex * 0.1 +
                                                letterIndex * 0.03,
                                            type: "spring",
                                            stiffness: 150,
                                            damping: 25,
                                        }}
                                        className="inline-block text-transparent bg-clip-text bg-gradient-to-r from-[#D4FF00] to-[#D4FF00]/70"
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
                        transition={{ delay: 0.5, type: "spring", stiffness: 150, damping: 25 }}
                        className="text-base md:text-lg text-[var(--muted)] mb-10 max-w-md mx-auto leading-relaxed"
                    >
                        AI-orchestrated video script approvals. Chase clients, not deadlines.
                    </motion.p>

                    {/* CTA Button */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.7, type: "spring", stiffness: 150, damping: 25 }}
                    >
                        <div
                            className="inline-block group relative bg-gradient-to-b from-[#D4FF00]/20 to-transparent
                            p-px rounded-2xl backdrop-blur-lg
                            overflow-hidden shadow-lg hover:shadow-xl hover:shadow-[#D4FF00]/10 transition-shadow duration-300"
                        >
                            <Link href="/login">
                                <Button
                                    variant="ghost"
                                    className="rounded-[1.15rem] px-8 py-6 text-lg font-semibold backdrop-blur-md
                                    bg-[var(--bg)]/95 hover:bg-[var(--bg)]/100
                                    text-[#D4FF00] transition-all duration-300
                                    group-hover:-translate-y-0.5 border border-[#D4FF00]/20 hover:border-[#D4FF00]/40
                                    hover:shadow-md"
                                >
                                    <span className="opacity-90 group-hover:opacity-100 transition-opacity">
                                        Start Chasing Clients
                                    </span>
                                    <span
                                        className="ml-3 opacity-70 group-hover:opacity-100 group-hover:translate-x-1.5
                                        transition-all duration-300"
                                    >
                                        &rarr;
                                    </span>
                                </Button>
                            </Link>
                        </div>
                    </motion.div>

                    {/* Footer */}
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1.2, duration: 1 }}
                        className="mt-20 text-xs text-[var(--muted)] opacity-40"
                    >
                        by ruskaruma &middot; for Scrollhouse
                    </motion.p>
                </motion.div>
            </div>
        </div>
    );
}
