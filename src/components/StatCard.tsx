import React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  accent = "primary",
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  accent?: "primary" | "success" | "warning" | "destructive";
}) {
  const accentMap = {
    primary: "bg-[#FF6B00]/15 text-[#FF6B00] border border-[#FF6B00]/30",
    success: "bg-success/15 text-success border border-success/25",
    warning: "bg-[#FF6B00]/15 text-[#FF8C38] border border-[#FF6B00]/25",
    destructive: "bg-destructive/15 text-destructive border border-destructive/25",
  } as const;

  return (
    <div className="glass-card relative overflow-hidden p-5 transition-all duration-200 hover:border-white/[0.15]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-medium tracking-wide text-white/55">{label}</div>
          <div className="mt-2 text-3xl font-display font-bold tracking-tight text-white tabular-nums">
            {value}
          </div>
          {hint && <div className="mt-1.5 text-xs text-white/50">{hint}</div>}
        </div>
        <div
          className={cn(
            "size-11 shrink-0 rounded-2xl flex items-center justify-center",
            accentMap[accent],
          )}
        >
          <Icon className="size-5 stroke-[1.75]" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}
