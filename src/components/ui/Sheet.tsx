"use client";

import { useEffect } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/cn";
import { springHeavy, settle } from "@/lib/motion";

interface SheetProps {
  open: boolean;
  onClose?: () => void;
  /** When false, the sheet cannot be dismissed (e.g. the active dossier). */
  dismissible?: boolean;
  /** When false, drag-to-dismiss is off (better for form sheets); backdrop/Esc still close. */
  draggable?: boolean;
  className?: string;
  children: React.ReactNode;
}

/* ───────────────────────────────────────────────────────────────────────────
   Sheet — a classified file rising from the bottom. Drag down to dismiss
   (when dismissible). Backdrop dims the archive rather than hiding it.
   ─────────────────────────────────────────────────────────────────────────── */
export function Sheet({ open, onClose, dismissible = true, draggable = true, className, children }: SheetProps) {
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && dismissible) onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, dismissible, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center">
          <motion.div
            className="absolute inset-0 bg-paper/70 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={settle}
            onClick={() => dismissible && onClose?.()}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            className={cn(
              "relative w-full max-w-2xl rounded-t-3xl border-t border-line-strong bg-paper-2 shadow-sheet",
              "max-h-[92dvh] overflow-y-auto sm:rounded-3xl sm:border",
              // Clear the floating Dock + home indicator on mobile.
              "pb-[max(7rem,calc(var(--safe-bottom)+6rem))] sm:pb-8",
              className,
            )}
            initial={reduce ? { opacity: 0 } : { y: "100%" }}
            animate={reduce ? { opacity: 1 } : { y: 0 }}
            exit={reduce ? { opacity: 0 } : { y: "100%" }}
            transition={springHeavy}
            drag={dismissible && draggable && !reduce ? "y" : false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={(_, info) => {
              if (dismissible && (info.offset.y > 140 || info.velocity.y > 600)) onClose?.();
            }}
          >
            {/* Grab handle */}
            <div className="sticky top-0 z-10 flex justify-center bg-gradient-to-b from-paper-2 to-transparent pt-3 pb-4">
              <div className="h-1 w-10 rounded-full bg-line-strong" />
            </div>
            <div className="px-5 sm:px-8">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
