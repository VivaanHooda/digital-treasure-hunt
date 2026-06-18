"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/cn";
import { revealVariants } from "@/lib/motion";

interface RevealSectionProps {
  /** Optional operational label rendered above the content. */
  label?: string;
  /** Stagger index — sections emerge in sequence. */
  index?: number;
  className?: string;
  children: React.ReactNode;
}

/* ───────────────────────────────────────────────────────────────────────────
   RevealSection — information uncovered, not popped. The layout reorganizes
   to admit a new section instead of opening a modal. Use inside an archive
   view; animates in on mount / when added to the tree.
   ─────────────────────────────────────────────────────────────────────────── */
export function RevealSection({ label, index = 0, className, children }: RevealSectionProps) {
  return (
    <motion.section
      layout
      custom={index}
      variants={revealVariants}
      initial="hidden"
      animate="show"
      className={cn("border-t border-line py-5", className)}
    >
      {label && <div className="label mb-3">{label}</div>}
      {children}
    </motion.section>
  );
}
