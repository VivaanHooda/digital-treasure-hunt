"use client";

import { cn } from "@/lib/cn";

const MAX_BARS = 7; // above this, bars would overflow the header — show numeric only

/**
 * Clearance tokens — the archive's equivalent of "skip hearts". Robust for any
 * admin-set maxSkips: renders bars only for small counts, otherwise a compact
 * numeric readout. Values are clamped so the UI never breaks.
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
  const max = Math.max(0, Math.floor(maxSkips || 0));
  const remaining = Math.max(0, Math.min(Math.floor(skipsRemaining || 0), max));
  const showBars = max >= 1 && max <= MAX_BARS;

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span className="label">Clearance</span>
      {showBars && (
        <div className="flex items-center gap-1.5">
          {Array.from({ length: max }, (_, i) => (
            <span
              key={i}
              className={cn(
                "h-3.5 w-[3px] rounded-full transition-colors duration-300",
                i < remaining ? "bg-signal" : "bg-line-strong",
              )}
            />
          ))}
        </div>
      )}
      <span className="data text-sm tabular-nums text-ink-2">{remaining}/{max}</span>
    </div>
  );
}
