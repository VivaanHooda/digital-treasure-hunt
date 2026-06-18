"use client";

import { ArrowRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

/* ───────────────────────────────────────────────────────────────────────────
   SweepButton — minimal but alive: a signal-outlined control whose fill wipes
   in from the left on hover/press while the label inverts to paper and the
   arrow advances. Full-width, great touch target. Used for auth submits.
   ─────────────────────────────────────────────────────────────────────────── */
export function SweepButton({
  children,
  loading,
  className,
  disabled,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={cn(
        "group relative h-[54px] w-full overflow-hidden rounded-xl border border-signal outline-none transition-opacity disabled:opacity-50",
        className,
      )}
    >
      {/* fill sweep */}
      <span
        aria-hidden
        className="absolute inset-0 origin-left scale-x-0 bg-signal transition-transform duration-500 ease-settle group-hover:scale-x-100 group-active:scale-x-100 group-focus-visible:scale-x-100"
      />
      <span className="relative z-10 flex items-center justify-center gap-2.5 font-mono text-xs uppercase tracking-[0.25em] text-signal transition-colors duration-300 group-hover:text-paper group-active:text-paper group-focus-visible:text-paper">
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {children}
          </>
        ) : (
          <>
            {children}
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1.5" />
          </>
        )}
      </span>
    </button>
  );
}
