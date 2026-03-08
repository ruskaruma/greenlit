"use client";

import { motion } from "framer-motion";
import { Bot, ShieldCheck, BarChart3 } from "lucide-react";

const features = [
  {
    icon: Bot,
    title: "AI Agent",
    description:
      "Autonomous email and WhatsApp chasing with configurable escalation schedules and tone adaptation.",
  },
  {
    icon: ShieldCheck,
    title: "Human-in-the-Loop",
    description:
      "Review and approve every AI-drafted message before it reaches your client. Full control, zero surprises.",
  },
  {
    icon: BarChart3,
    title: "Quality Scoring",
    description:
      "Claude-powered script analysis across hook strength, CTA clarity, and tone consistency.",
  },
];

export default function FeaturesSection() {
  return (
    <section className="py-24 px-6 bg-[var(--bg)]">
      <div className="max-w-5xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-3xl md:text-4xl font-bold text-center text-[var(--text)] mb-4 tracking-tight"
          style={{ fontFamily: "var(--font-playfair), serif" }}
        >
          Unlock Automated Approvals
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="text-center text-[var(--muted)] mb-16 max-w-md mx-auto"
        >
          Everything you need to get scripts approved faster.
        </motion.p>

        <div className="grid md:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="p-6 rounded-xl bg-[var(--card)] border border-[var(--border)] hover:border-[#D4FF00]/30 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-[#D4FF00]/10 flex items-center justify-center mb-4">
                <f.icon size={20} className="text-[#D4FF00]" />
              </div>
              <h3 className="text-lg font-semibold text-[var(--text)] mb-2">{f.title}</h3>
              <p className="text-sm text-[var(--muted)] leading-relaxed">{f.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
