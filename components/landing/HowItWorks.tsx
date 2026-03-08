"use client";

import { motion } from "framer-motion";

const steps = [
  { num: "01", title: "Upload Script", desc: "Drop your video script and assign a client" },
  { num: "02", title: "AI Scores & Drafts", desc: "Quality scoring + chase message generation" },
  { num: "03", title: "HITL Review", desc: "Approve, edit, or reject the AI draft" },
  { num: "04", title: "Client Responds", desc: "Email or WhatsApp delivery with tracking" },
  { num: "05", title: "Approved", desc: "Client approves or requests changes, loop continues" },
];

export default function HowItWorks() {
  return (
    <section className="py-24 px-6 bg-[var(--surface-elevated)]">
      <div className="max-w-5xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-3xl md:text-4xl font-bold text-center text-[var(--text)] mb-16 tracking-tight"
          style={{ fontFamily: "var(--font-playfair), serif" }}
        >
          From Upload to Approval
        </motion.h2>

        <div className="grid md:grid-cols-5 gap-4">
          {steps.map((s, i) => (
            <motion.div
              key={s.num}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.5 }}
              className="relative text-center"
            >
              <div className="text-[32px] font-bold text-[#D4FF00]/20 mb-2 font-mono">{s.num}</div>
              <h3 className="text-sm font-semibold text-[var(--text)] mb-1">{s.title}</h3>
              <p className="text-xs text-[var(--muted)] leading-relaxed">{s.desc}</p>
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute top-5 -right-2 w-4 text-[#D4FF00]/30 text-lg">&rarr;</div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
