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
    primary: "bg-primary/15 text-primary",
    success: "bg-success/15 text-success",
    warning: "bg-warning/15 text-warning",
    destructive: "bg-destructive/15 text-destructive",
  } as const;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-[image:var(--gradient-surface)] p-5 shadow-[var(--shadow-card)] transition-[var(--transition-smooth)] hover:border-primary/40 hover:shadow-[var(--shadow-glow)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </div>
          <div className="mt-2 text-3xl font-display font-bold tracking-tight">
            {value}
          </div>
          {hint && (
            <div className="mt-1.5 text-xs text-muted-foreground">{hint}</div>
          )}
        </div>
        <div
          className={cn(
            "size-11 shrink-0 rounded-xl flex items-center justify-center",
            accentMap[accent],
          )}
        >
          <Icon className="size-5" />
        </div>
      </div>
    </div>
  );
}
