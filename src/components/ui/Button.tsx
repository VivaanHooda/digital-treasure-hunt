"use client";

import { forwardRef, useRef } from "react";
import { motion, useMotionValue, useSpring, useReducedMotion } from "framer-motion";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";
import { spring } from "@/lib/motion";

/* Magnetic, spring-driven button. Variant-driven via cva. */
const button = cva(
  "relative inline-flex items-center justify-center gap-2 select-none whitespace-nowrap font-sans font-medium transition-colors duration-200 ease-settle disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-signal",
  {
    variants: {
      variant: {
        // Primary operational action — solid signal accent
        primary: "bg-signal text-paper hover:bg-signal/90",
        // Secondary — hairline on paper
        outline: "border border-line-strong text-ink hover:bg-paper-2 hover:border-ink-3",
        // Quiet — text only
        ghost: "text-ink-2 hover:text-ink hover:bg-paper-2",
        // Destructive / classified
        alert: "border border-alert/40 text-alert hover:bg-alert/10",
      },
      size: {
        sm: "h-9 px-4 text-sm rounded-lg",
        md: "h-12 px-6 text-[0.95rem] rounded-xl",
        lg: "h-14 px-8 text-base rounded-xl",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onAnimationStart" | "onDragStart" | "onDragEnd" | "onDrag">,
    VariantProps<typeof button> {
  /** Disable the magnetic pull (e.g. full-width buttons). */
  noMagnet?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, noMagnet, children, ...props }, ref) => {
    const reduce = useReducedMotion();
    const innerRef = useRef<HTMLButtonElement | null>(null);
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const sx = useSpring(x, spring);
    const sy = useSpring(y, spring);

    const onMove = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (reduce || noMagnet) return;
      const el = innerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const mx = e.clientX - (r.left + r.width / 2);
      const my = e.clientY - (r.top + r.height / 2);
      x.set(mx * 0.18);
      y.set(my * 0.22);
    };
    const reset = () => {
      x.set(0);
      y.set(0);
    };

    return (
      <motion.button
        ref={(node) => {
          innerRef.current = node;
          if (typeof ref === "function") ref(node);
          else if (ref) ref.current = node;
        }}
        style={reduce || noMagnet ? undefined : { x: sx, y: sy }}
        whileTap={reduce ? undefined : { scale: 0.97 }}
        onMouseMove={onMove}
        onMouseLeave={reset}
        className={cn(button({ variant, size }), className)}
        {...props}
      >
        {children}
      </motion.button>
    );
  },
);
Button.displayName = "Button";
