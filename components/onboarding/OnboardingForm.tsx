"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User, Mail, Building2, Phone, Globe, Instagram, Youtube,
  Mic, UserCheck, Calendar, Hash, ChevronRight, ChevronLeft,
  Loader2, Check, ExternalLink, ArrowRight, Plus, RotateCcw,
  CheckCircle2, Clock, FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/ToastProvider";
import Link from "next/link";

/* ---------- Types ---------- */

interface FormData {
  name: string;
  email: string;
  company: string;
  whatsapp_number: string;
  preferred_channel: string;
  instagram_handle: string;
  youtube_channel_id: string;
  brand_voice: string;
  account_manager: string;
  contract_start: string;
  monthly_volume: string;
  platform_focus: string[];
}

interface OnboardingResult {
  client: { id: string; name: string };
  results: Record<string, { success: boolean; error?: string }>;
}

const PLATFORMS = ["Instagram", "YouTube", "LinkedIn", "TikTok"] as const;
const CHANNELS = ["email", "whatsapp", "both"] as const;
const STEPS = ["Client Basics", "Contract Details", "Brand Intelligence", "Review & Submit"] as const;

/* ---------- Component ---------- */

export default function OnboardingForm() {
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<OnboardingResult | null>(null);

  // Checklist state (for manual items post-submit)
  const [checklist, setChecklist] = useState({
    google_drive: false,
    notion_page: false,
    airtable_entry: false,
  });

  const [form, setForm] = useState<FormData>({
    name: "",
    email: "",
    company: "",
    whatsapp_number: "",
    preferred_channel: "email",
    instagram_handle: "",
    youtube_channel_id: "",
    brand_voice: "",
    account_manager: "",
    contract_start: "",
    monthly_volume: "",
    platform_focus: [],
  });

  function update(field: keyof FormData, value: string | string[]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function togglePlatform(platform: string) {
    setForm((prev) => ({
      ...prev,
      platform_focus: prev.platform_focus.includes(platform)
        ? prev.platform_focus.filter((p) => p !== platform)
        : [...prev.platform_focus, platform],
    }));
  }

  function canProceed(): boolean {
    if (step === 0) return !!form.name.trim() && !!form.email.trim();
    return true;
  }

  async function handleSubmit() {
    if (!form.name.trim() || !form.email.trim()) {
      toast("error", "Name and email are required");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const e = await res.json();
        toast("error", e.error ?? "Onboarding failed");
        return;
      }

      const data = await res.json();
      setResult(data);
      toast("success", `${form.name} onboarded successfully`);
    } catch {
      toast("error", "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  function handleReset() {
    setForm({
      name: "", email: "", company: "", whatsapp_number: "",
      preferred_channel: "email", instagram_handle: "", youtube_channel_id: "",
      brand_voice: "", account_manager: "", contract_start: "",
      monthly_volume: "", platform_focus: [],
    });
    setStep(0);
    setResult(null);
    setChecklist({ google_drive: false, notion_page: false, airtable_entry: false });
  }

  /* ---------- Post-Submit View ---------- */
  if (result) {
    const r = result.results;
    return (
      <div className="max-w-2xl mx-auto py-12 px-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-[var(--accent-success)]/10 border border-[var(--accent-success)]/30 flex items-center justify-center">
              <CheckCircle2 size={20} className="text-[var(--accent-success)]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[var(--text)]">{result.client.name} onboarded</h2>
              <p className="text-xs text-[var(--muted)]">Complete the checklist below to finish setup.</p>
            </div>
          </div>

          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl divide-y divide-[var(--border)]">
            {/* Automated */}
            <ChecklistItem
              label="Welcome Email"
              success={r.welcome_email?.success ?? false}
              error={r.welcome_email?.error}
              automated
            />
            <ChecklistItem
              label="Client Memories Seeded"
              success={r.memories?.success ?? false}
              error={r.memories?.error}
              automated
            />
            <ChecklistItem
              label="WhatsApp Notification"
              success={r.whatsapp?.success ?? false}
              error={r.whatsapp?.error}
              automated
            />

            {/* Manual */}
            <ManualChecklistItem
              label="Google Drive Folder"
              done={checklist.google_drive}
              onMark={() => setChecklist((p) => ({ ...p, google_drive: true }))}
            />
            <ManualChecklistItem
              label="Notion Page"
              done={checklist.notion_page}
              onMark={() => setChecklist((p) => ({ ...p, notion_page: true }))}
            />
            <ManualChecklistItem
              label="Airtable Entry"
              done={checklist.airtable_entry}
              onMark={() => setChecklist((p) => ({ ...p, airtable_entry: true }))}
            />

            {/* First Brief */}
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Clock size={14} className="text-amber-400" />
                <div>
                  <p className="text-sm text-[var(--text)]">First Brief</p>
                  <p className="text-[10px] text-[var(--muted)]">Upload the first script for this client</p>
                </div>
              </div>
              <Link
                href="/dashboard"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-elevated)] transition-colors"
              >
                <FileText size={11} />
                Upload Script
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-3 mt-6">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-primary)]/90 glow-primary transition-colors"
            >
              View on Dashboard
              <ArrowRight size={12} />
            </Link>
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-medium border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-elevated)] transition-colors"
            >
              <Plus size={12} />
              Onboard Another
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  /* ---------- Form Steps ---------- */
  return (
    <div className="max-w-2xl mx-auto py-8 px-6">
      {/* Step Indicator */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <button
              onClick={() => i <= step && setStep(i)}
              className={cn(
                "flex items-center gap-1.5 text-[11px] font-medium transition-colors",
                i === step ? "text-[var(--accent-primary)]" : i < step ? "text-[var(--text)]" : "text-[var(--muted)] opacity-40"
              )}
            >
              <span className={cn(
                "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border",
                i === step ? "border-[var(--accent-primary)] text-[var(--accent-primary)] bg-[var(--accent-primary)]/10" :
                i < step ? "border-[var(--accent-success)] text-[var(--accent-success)] bg-[var(--accent-success)]/10" :
                "border-[var(--border)] text-[var(--muted)]"
              )}>
                {i < step ? <Check size={10} /> : i + 1}
              </span>
              {label}
            </button>
            {i < STEPS.length - 1 && <div className="w-8 h-px bg-[var(--border)]" />}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          {/* Step 0: Client Basics */}
          {step === 0 && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold text-[var(--text)]">Client Basics</h2>

              <Field icon={User} label="Client Name *">
                <input type="text" value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="John Smith" className={inputCls} />
              </Field>
              <Field icon={Mail} label="Email *">
                <input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="john@brand.com" className={inputCls} />
              </Field>
              <Field icon={Building2} label="Company">
                <input type="text" value={form.company} onChange={(e) => update("company", e.target.value)} placeholder="Brand Co." className={inputCls} />
              </Field>
              <Field icon={Phone} label="WhatsApp Number">
                <input type="text" value={form.whatsapp_number} onChange={(e) => update("whatsapp_number", e.target.value)} placeholder="+91XXXXXXXXXX" className={inputCls} />
              </Field>
              <Field icon={Globe} label="Preferred Channel">
                <div className="flex gap-2">
                  {CHANNELS.map((ch) => (
                    <button
                      key={ch}
                      type="button"
                      onClick={() => update("preferred_channel", ch)}
                      className={cn(
                        "px-4 py-2 rounded-lg text-xs font-medium capitalize transition-colors",
                        form.preferred_channel === ch
                          ? "border border-[var(--accent-primary)] text-[var(--accent-primary)] bg-[var(--accent-primary)]/10"
                          : "bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)]"
                      )}
                    >
                      {ch}
                    </button>
                  ))}
                </div>
              </Field>
              <Field icon={Instagram} label="Instagram Handle">
                <input type="text" value={form.instagram_handle} onChange={(e) => update("instagram_handle", e.target.value)} placeholder="@brandhandle" className={inputCls} />
              </Field>
              <Field icon={Youtube} label="YouTube Channel ID">
                <input type="text" value={form.youtube_channel_id} onChange={(e) => update("youtube_channel_id", e.target.value)} placeholder="UC..." className={inputCls} />
              </Field>
            </div>
          )}

          {/* Step 1: Contract Details */}
          {step === 1 && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold text-[var(--text)]">Contract Details</h2>

              <Field icon={UserCheck} label="Account Manager">
                <input type="text" value={form.account_manager} onChange={(e) => update("account_manager", e.target.value)} placeholder="Who manages this client?" className={inputCls} />
              </Field>
              <Field icon={Calendar} label="Contract Start Date">
                <input type="date" value={form.contract_start} onChange={(e) => update("contract_start", e.target.value)} className={inputCls + " cursor-pointer"} />
              </Field>
              <Field icon={Hash} label="Monthly Content Volume">
                <input type="number" value={form.monthly_volume} onChange={(e) => update("monthly_volume", e.target.value)} placeholder="e.g. 12" className={inputCls + " [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"} />
              </Field>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-[var(--muted)] opacity-50 mb-3">Platform Focus</p>
                <div className="flex gap-2 flex-wrap">
                  {PLATFORMS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => togglePlatform(p)}
                      className={cn(
                        "px-4 py-2 rounded-lg text-xs font-medium transition-colors",
                        form.platform_focus.includes(p)
                          ? "border border-[var(--accent-primary)] text-[var(--accent-primary)] bg-[var(--accent-primary)]/10"
                          : "bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)]"
                      )}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Brand Intelligence */}
          {step === 2 && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold text-[var(--text)]">Brand Intelligence</h2>
              <p className="text-xs text-[var(--muted)]">This gets stored in client memory. The AI agent uses it to match tone in chasers and reports.</p>

              <Field icon={Mic} label="Brand Voice & Communication Style">
                <textarea
                  value={form.brand_voice}
                  onChange={(e) => update("brand_voice", e.target.value)}
                  rows={5}
                  placeholder="e.g. Casual and friendly. Likes short sentences. Prefers bullet points over paragraphs. Responds well to direct CTAs. Dislikes corporate jargon."
                  className={inputCls + " resize-y min-h-[120px]"}
                />
              </Field>
            </div>
          )}

          {/* Step 3: Review & Submit */}
          {step === 3 && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold text-[var(--text)]">Review & Submit</h2>

              <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl divide-y divide-[var(--border)]">
                <ReviewRow label="Name" value={form.name} />
                <ReviewRow label="Email" value={form.email} />
                <ReviewRow label="Company" value={form.company} />
                <ReviewRow label="WhatsApp" value={form.whatsapp_number} />
                <ReviewRow label="Channel" value={form.preferred_channel} />
                <ReviewRow label="Instagram" value={form.instagram_handle} />
                <ReviewRow label="YouTube" value={form.youtube_channel_id} />
                <ReviewRow label="Account Manager" value={form.account_manager} />
                <ReviewRow label="Contract Start" value={form.contract_start} />
                <ReviewRow label="Monthly Volume" value={form.monthly_volume ? `${form.monthly_volume} pieces` : ""} />
                <ReviewRow label="Platforms" value={form.platform_focus.join(", ")} />
                <ReviewRow label="Brand Voice" value={form.brand_voice ? (form.brand_voice.length > 80 ? form.brand_voice.slice(0, 80) + "..." : form.brand_voice) : ""} />
              </div>

              <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-4">
                <p className="text-xs text-amber-400">On submit, Greenlit will:</p>
                <ul className="text-xs text-[var(--muted)] mt-2 space-y-1">
                  <li>1. Create the client in the database</li>
                  <li>2. Seed 3 AI memories with embeddings (brand voice, preferences, channel)</li>
                  <li>3. Send a welcome email to {form.email || "the client"}</li>
                  <li>4. Notify you via WhatsApp</li>
                </ul>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-8">
        <button
          onClick={() => setStep(Math.max(0, step - 1))}
          disabled={step === 0}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium text-[var(--muted)] hover:text-[var(--text)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft size={14} />
          Back
        </button>

        {step < STEPS.length - 1 ? (
          <button
            onClick={() => setStep(step + 1)}
            disabled={!canProceed()}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-xs font-bold bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-primary)]/90 glow-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next
            <ChevronRight size={14} />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={submitting || !form.name.trim() || !form.email.trim()}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-xs font-bold bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-primary)]/90 glow-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            {submitting ? "Onboarding..." : "Submit & Onboard"}
          </button>
        )}
      </div>
    </div>
  );
}

/* ---------- Helpers ---------- */

const inputCls = "w-full px-3 py-2.5 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent";

function Field({ icon: Icon, label, children }: { icon: typeof User; label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <Icon size={12} className="text-[var(--muted)]" />
        <label className="text-[10px] uppercase tracking-widest text-[var(--muted)] opacity-50">{label}</label>
      </div>
      {children}
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-xs text-[var(--muted)]">{label}</span>
      <span className="text-xs text-[var(--text)] font-medium">{value || <span className="text-[var(--muted)] opacity-30">Not set</span>}</span>
    </div>
  );
}

function ChecklistItem({ label, success, error, automated }: { label: string; success: boolean; error?: string; automated?: boolean }) {
  return (
    <div className="flex items-center justify-between p-4">
      <div className="flex items-center gap-3">
        {success ? (
          <CheckCircle2 size={14} className="text-[var(--accent-success)]" />
        ) : (
          <Clock size={14} className="text-red-400" />
        )}
        <div>
          <p className="text-sm text-[var(--text)]">{label}</p>
          {error && <p className="text-[10px] text-red-400">{error}</p>}
        </div>
      </div>
      {automated && (
        <span className={cn("text-[10px] font-medium", success ? "text-[var(--accent-success)]" : "text-red-400")}>
          {success ? "Automated" : "Failed"}
        </span>
      )}
    </div>
  );
}

function ManualChecklistItem({ label, done, onMark }: { label: string; done: boolean; onMark: () => void }) {
  return (
    <div className="flex items-center justify-between p-4">
      <div className="flex items-center gap-3">
        {done ? (
          <CheckCircle2 size={14} className="text-[var(--accent-success)]" />
        ) : (
          <Clock size={14} className="text-amber-400" />
        )}
        <div>
          <p className="text-sm text-[var(--text)]">{label}</p>
          <p className="text-[10px] text-[var(--muted)]">Manual</p>
        </div>
      </div>
      {done ? (
        <span className="text-[10px] text-[var(--accent-success)] font-medium">Done</span>
      ) : (
        <button
          onClick={onMark}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-elevated)] transition-colors"
        >
          <Check size={10} />
          Mark done
        </button>
      )}
    </div>
  );
}
