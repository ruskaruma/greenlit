import OnboardingForm from "@/components/onboarding/OnboardingForm";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function OnboardingPage() {
  return (
    <div className="min-h-screen bg-[var(--bg)] transition-colors duration-300">
      <header className="flex items-center gap-4 px-6 py-4 border-b border-[var(--border)]">
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 text-xs text-[var(--muted)] hover:text-[var(--text)] transition-colors"
        >
          <ArrowLeft size={14} />
          Dashboard
        </Link>
        <div className="h-4 w-px bg-[var(--border)]" />
        <h1 className="text-lg font-semibold text-[var(--text)]">Client Onboarding</h1>
      </header>

      <OnboardingForm />
    </div>
  );
}
