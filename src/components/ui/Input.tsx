"use client";

import { forwardRef, useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/cn";

/* ───────────────────────────────────────────────────────────────────────────
   Input — a substantial, mobile-first field: a small operational mono caption
   above a filled, rounded control with a comfortable touch height. Focus lights
   the border signal and lifts the surface. 16px text avoids iOS zoom-on-focus.
   ─────────────────────────────────────────────────────────────────────────── */
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, id, className, type = "text", ...props }, ref) => {
    const autoId = useId();
    const inputId = id ?? autoId;
    const [reveal, setReveal] = useState(false);
    const isPassword = type === "password";
    const resolvedType = isPassword && reveal ? "text" : type;

    return (
      <div className="w-full">
        <label htmlFor={inputId} className="label mb-2 block">{label}</label>
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            type={resolvedType}
            className={cn(
              "h-[52px] w-full rounded-xl border bg-paper-1 px-4 text-[16px] text-ink outline-none transition-all duration-200",
              "placeholder:text-ink-3/70",
              "focus:bg-paper-2",
              isPassword && "pr-12",
              error ? "border-alert focus:border-alert" : "border-line focus:border-signal",
              className,
            )}
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setReveal((v) => !v)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-3 transition-colors hover:text-ink"
              aria-label={reveal ? "Hide" : "Show"}
            >
              {reveal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          )}
        </div>
        {error && <p className="mt-1.5 text-xs text-alert">{error}</p>}
      </div>
    );
  },
);
Input.displayName = "Input";
