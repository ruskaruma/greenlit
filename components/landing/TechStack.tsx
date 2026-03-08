"use client";

import { motion } from "framer-motion";

const stack = [
  "Next.js 16",
  "React 19",
  "Tailwind CSS v4",
  "Supabase",
  "Claude AI",
  "Resend",
  "Twilio",
  "Framer Motion",
];

export default function TechStack() {
  return (
    <section className="py-24 px-6 bg-[var(--bg)]">
      <div className="max-w-3xl mx-auto text-center">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-3xl md:text-4xl font-bold text-[var(--text)] mb-12 tracking-tight"
          style={{ fontFamily: "var(--font-playfair), serif" }}
        >
          Built With
        </motion.h2>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="flex flex-wrap justify-center gap-3"
        >
          {stack.map((t, i) => (
            <motion.span
              key={t}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
              className="px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--card)] text-sm text-[var(--text)] font-medium"
            >
              {t}
            </motion.span>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
