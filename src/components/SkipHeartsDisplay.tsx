"use client";

import { cn } from "@/lib/cn";

/**
 * Clearance tokens — the archive's equivalent of "skip hearts". A spent token
 * is struck through. Prop API unchanged (skipsRemaining / maxSkips).
 */
export default function SkipHeartsDisplay({
  skipsRemaining,
  maxSkips = 3,
  className = "",
}: {
  skipsRemaining: number;
  maxSkips?: number;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span className="label">Clearance</span>
      <div className="flex items-center gap-1.5">
        {Array.from({ length: maxSkips }, (_, i) => {
          const available = i < skipsRemaining;
          return (
            <span
              key={i}
              className={cn(
                "h-3.5 w-[3px] rounded-full transition-colors duration-300",
                available ? "bg-signal" : "bg-line-strong",
              )}
            />
          );
        })}
      </div>
      <span className="data text-sm tabular-nums text-ink-2">{skipsRemaining}/{maxSkips}</span>
    </div>
  );
}
