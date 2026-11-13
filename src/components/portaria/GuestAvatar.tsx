import React from "react";
import { cn } from "@/lib/utils";
import { isVipTicketType } from "./types";

const AVATAR_GRADIENTS = [
  "from-[#FF6B00]/35 via-[#FF6B00]/10 to-white/[0.04]",
  "from-white/[0.16] via-white/[0.06] to-white/[0.02]",
  "from-[#FF8533]/30 via-[#2a1d14] to-white/[0.04]",
  "from-zinc-500/30 via-zinc-800/60 to-zinc-900/90",
];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function hashIndex(text: string): number {
  let acc = 0;
  for (let i = 0; i < text.length; i++) {
    acc = (acc * 31 + text.charCodeAt(i)) | 0;
  }
  return Math.abs(acc) % AVATAR_GRADIENTS.length;
}

export function GuestAvatar({
  name,
  ticketType,
  validated,
  avatarUrl,
  size = "md",
}: {
  name: string;
  ticketType?: string;
  validated?: boolean;
  avatarUrl?: string | null;
  size?: "sm" | "md";
}) {
  const vip = isVipTicketType(ticketType);
  const grad = AVATAR_GRADIENTS[hashIndex(name)];
  const dimensions =
    size === "sm" ? "size-9 rounded-[12px] text-xs" : "size-11 rounded-[14px] text-sm";

  return (
    <div className="relative shrink-0">
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={name}
          className={cn(
            dimensions,
            "object-cover border",
            vip ? "border-[#FF6B00]/40" : "border-white/[0.12]",
          )}
        />
      ) : (
        <div
          aria-hidden="true"
          className={cn(
            dimensions,
            "bg-gradient-to-br flex items-center justify-center font-display font-semibold tracking-tight text-white/90 border",
            grad,
            vip ? "border-[#FF6B00]/35" : "border-white/[0.1]",
          )}
        >
          {getInitials(name)}
        </div>
      )}

      {/* Status Indicator Dot */}
      <span
        title={validated ? "Entrada validada" : "Aguardando check-in"}
        className={cn(
          "absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-[#161619]",
          validated ? "bg-[#FF6B00] shadow-[0_0_8px_rgba(255,107,0,0.85)]" : "bg-white/25",
        )}
      />
    </div>
  );
}
