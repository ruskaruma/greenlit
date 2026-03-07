"use client";

import { Check, Clock, Send, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

type Stage = "generated" | "pending_hitl" | "approved" | "sent";

interface HitlTimelineProps {
  currentStage: Stage;
}

const stages: { key: Stage; label: string; icon: typeof Check }[] = [
  { key: "generated", label: "Generated", icon: Clock },
  { key: "pending_hitl", label: "Review", icon: Eye },
  { key: "approved", label: "Approved", icon: Check },
  { key: "sent", label: "Sent", icon: Send },
];

function getStageIndex(stage: Stage): number {
  return stages.findIndex((s) => s.key === stage);
}

export default function HitlTimeline({ currentStage }: HitlTimelineProps) {
  const currentIndex = getStageIndex(currentStage);

  return (
    <div className="flex items-center gap-0 w-full">
      {stages.map((stage, i) => {
        const isComplete = i < currentIndex;
        const isCurrent = i === currentIndex;
        const Icon = stage.icon;

        return (
          <div key={stage.key} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center border transition-colors",
                  isComplete && "bg-[#00ff88]/15 border-[#00ff88] text-[#00ff88]",
                  isCurrent && "bg-orange-400/15 border-orange-400 text-orange-400",
                  !isComplete && !isCurrent && "border-[var(--border)] text-[var(--muted)] opacity-40"
                )}
              >
                <Icon size={10} />
              </div>
              <span
                className={cn(
                  "text-[9px] whitespace-nowrap",
                  isComplete && "text-[#00ff88]",
                  isCurrent && "text-orange-400 font-medium",
                  !isComplete && !isCurrent && "text-[var(--muted)] opacity-40"
                )}
              >
                {stage.label}
              </span>
            </div>
            {i < stages.length - 1 && (
              <div
                className={cn(
                  "h-px flex-1 mx-1 mb-4",
                  i < currentIndex ? "bg-[#00ff88]/40" : "bg-[var(--border)]"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
