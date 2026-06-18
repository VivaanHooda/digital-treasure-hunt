"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";
import { settle } from "@/lib/motion";

/* ───────────────────────────────────────────────────────────────────────────
   Select — our own dropdown (no native <select>), matching Input: a small mono
   caption above a filled trigger, with an animated panel, outside-click +
   Escape dismiss, and a check on the chosen option.
   ─────────────────────────────────────────────────────────────────────────── */
type Option = string | { value: string; label: string };

export function Select({
  label,
  value,
  onChange,
  options,
  error,
  placeholder = "Select",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  error?: string;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const opts = options.map((o) => (typeof o === "string" ? { value: o, label: o } : o));
  const selected = opts.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="w-full" ref={ref}>
      <span className="label mb-2 block">{label}</span>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="listbox"
          aria-expanded={open}
          className={cn(
            "flex h-[52px] w-full items-center justify-between gap-2 rounded-xl border bg-paper-1 px-4 text-left text-[16px] outline-none transition-all duration-200",
            open && "bg-paper-2",
            error ? "border-alert" : open ? "border-signal" : "border-line",
          )}
        >
          <span className={cn("truncate", selected ? "text-ink" : "text-ink-3/70")}>{selected?.label ?? placeholder}</span>
          <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform duration-200", open ? "rotate-180 text-signal" : "text-ink-3")} />
        </button>

        <AnimatePresence>
          {open && (
            <motion.ul
              role="listbox"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={settle}
              className="absolute z-30 mt-2 max-h-60 w-full overflow-y-auto rounded-xl border border-line-strong bg-paper-2 p-1 shadow-dock"
            >
              {opts.map((o) => {
                const active = o.value === value;
                return (
                  <li key={o.value}>
                    <button
                      type="button"
                      onClick={() => {
                        onChange(o.value);
                        setOpen(false);
                      }}
                      className={cn(
                        "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-3 text-left text-sm transition-colors",
                        active ? "bg-signal-soft text-signal" : "text-ink hover:bg-paper-3",
                      )}
                    >
                      <span>{o.label}</span>
                      {active && <Check className="h-4 w-4 shrink-0" />}
                    </button>
                  </li>
                );
              })}
            </motion.ul>
          )}
        </AnimatePresence>
      </div>
      {error && <p className="mt-1.5 text-xs text-alert">{error}</p>}
    </div>
  );
}
