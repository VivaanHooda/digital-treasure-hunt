import type { Transition, Variants } from "framer-motion";

/* ───────────────────────────────────────────────────────────────────────────
   Motion system — every interaction follows: anticipation → movement → settle.
   Nothing appears or disappears instantly. Everything has weight and intent.
   All consumers must also honor prefers-reduced-motion (see useReducedMotion).
   ─────────────────────────────────────────────────────────────────────────── */

/** Primary physical spring — for sheets, docks, magnetic elements. */
export const spring: Transition = {
  type: "spring",
  stiffness: 420,
  damping: 38,
  mass: 0.9,
};

/** Heavier spring — for large surfaces settling (dossier sheet, rank rows). */
export const springHeavy: Transition = {
  type: "spring",
  stiffness: 260,
  damping: 34,
  mass: 1.1,
};

/** Editorial ease — for opacity/position reveals that shouldn't bounce. */
export const settle: Transition = {
  duration: 0.5,
  ease: [0.16, 1, 0.3, 1],
};

/** Progressive reveal of a section — content emerging from the archive. */
export const revealVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { ...settle, delay: i * 0.06 },
  }),
};

/** Staggered container for ordered reveals. */
export const staggerContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

/** Capsule (Dynamic Island style) — expand from a point, settle, collapse. */
export const capsuleVariants: Variants = {
  hidden: { opacity: 0, scale: 0.8, y: -12 },
  show: { opacity: 1, scale: 1, y: 0, transition: spring },
  exit: { opacity: 0, scale: 0.9, y: -8, transition: settle },
};
