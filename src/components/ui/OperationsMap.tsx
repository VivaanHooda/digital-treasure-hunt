"use client";

import { useMemo, useRef } from "react";
import { motion, useMotionValue, useSpring, useReducedMotion } from "framer-motion";
import { spring, settle } from "@/lib/motion";

/* ───────────────────────────────────────────────────────────────────────────
   OperationsMap — a live expedition network. Each mission is a checkpoint on a
   plotted route: traveled legs are solid, the next leg is being charted, the
   rest is classified. The current position pulses. Subtle pointer parallax.
   No particles, no spinning — it should feel like a tracked operation.
   ─────────────────────────────────────────────────────────────────────────── */

const W = 1000;
const H = 360;
const PAD = 70;

// Stable pseudo-random in [-1,1] from an integer seed.
function jitter(i: number) {
  const s = Math.sin(i * 12.9898) * 43758.5453;
  return (s - Math.floor(s)) * 2 - 1;
}

export function OperationsMap({
  total,
  currentNumber,
  className,
}: {
  total: number;
  /** 1-indexed active mission. */
  currentNumber: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const n = Math.max(1, total);
  const activeIdx = Math.min(n - 1, Math.max(0, currentNumber - 1));

  const nodes = useMemo(() => {
    return Array.from({ length: n }, (_, i) => {
      const t = n === 1 ? 0.5 : i / (n - 1);
      const x = PAD + t * (W - PAD * 2);
      const y = H / 2 + Math.sin(t * Math.PI * 3) * (H / 2 - PAD) + jitter(i) * 22;
      return { x, y, i };
    });
  }, [n]);

  // Pointer parallax — nearly imperceptible.
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const tx = useSpring(px, spring);
  const ty = useSpring(py, spring);
  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (reduce) return;
    const r = e.currentTarget.getBoundingClientRect();
    px.set(((e.clientX - (r.left + r.width / 2)) / r.width) * 10);
    py.set(((e.clientY - (r.top + r.height / 2)) / r.height) * 10);
  };
  const reset = () => { px.set(0); py.set(0); };

  const active = nodes[activeIdx];

  return (
    <div
      onMouseMove={onMove}
      onMouseLeave={reset}
      className={`relative overflow-hidden rounded-2xl border border-line-strong bg-paper-1 ${className ?? ""}`}
    >
      {/* HUD frame */}
      <div className="pointer-events-none absolute inset-0 z-10">
        <span className="absolute left-3 top-3 h-3 w-3 border-l border-t border-signal/60" />
        <span className="absolute right-3 top-3 h-3 w-3 border-r border-t border-signal/60" />
        <span className="absolute bottom-3 left-3 h-3 w-3 border-b border-l border-signal/60" />
        <span className="absolute bottom-3 right-3 h-3 w-3 border-b border-r border-signal/60" />
      </div>
      <div className="absolute left-4 top-3.5 z-10 flex items-center gap-2">
        <span className="label !text-ink-2">Operations Map</span>
      </div>
      <div className="absolute right-4 top-3.5 z-10 flex items-center gap-2">
        <span className="h-1.5 w-1.5 animate-breathe rounded-full bg-signal" />
        <span className="label !text-signal !tracking-[0.18em]">Tracking</span>
      </div>

      <motion.div style={reduce ? undefined : { x: tx, y: ty }} className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" preserveAspectRatio="xMidYMid meet">
          {/* faint axes through the current position */}
          <line x1="0" y1={active.y} x2={W} y2={active.y} stroke="var(--line)" strokeWidth="1" />
          <line x1={active.x} y1="0" x2={active.x} y2={H} stroke="var(--line)" strokeWidth="1" />
          {/* range rings around the current position */}
          {[34, 60, 90].map((r) => (
            <circle key={r} cx={active.x} cy={active.y} r={r} fill="none" stroke="var(--line)" strokeWidth="1" opacity="0.5" />
          ))}

          {/* route legs */}
          {nodes.slice(0, -1).map((p, i) => {
            const q = nodes[i + 1];
            const traveled = i + 1 <= activeIdx;
            const charting = i + 1 === activeIdx + 1; // next leg being plotted
            return (
              <motion.line
                key={i}
                x1={p.x} y1={p.y} x2={q.x} y2={q.y}
                stroke={traveled ? "var(--signal)" : "var(--line-strong)"}
                strokeWidth={traveled ? 1.6 : 1}
                strokeDasharray={traveled ? undefined : "2 7"}
                opacity={traveled ? 0.85 : charting ? 0.7 : 0.35}
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ ...settle, delay: Math.min(i * 0.03, 0.6) }}
              />
            );
          })}

          {/* checkpoints */}
          {nodes.map((p) => {
            const done = p.i < activeIdx;
            const current = p.i === activeIdx;
            if (current) {
              return (
                <g key={p.i}>
                  <motion.circle
                    cx={p.x} cy={p.y} r="16" fill="none" stroke="var(--signal)" strokeWidth="1"
                    animate={reduce ? {} : { r: [12, 20, 12], opacity: [0.5, 0, 0.5] }}
                    transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
                  />
                  <circle cx={p.x} cy={p.y} r="5" fill="var(--signal)" />
                  <line x1={p.x - 11} y1={p.y} x2={p.x + 11} y2={p.y} stroke="var(--signal)" strokeWidth="0.75" opacity="0.6" />
                  <line x1={p.x} y1={p.y - 11} x2={p.x} y2={p.y + 11} stroke="var(--signal)" strokeWidth="0.75" opacity="0.6" />
                </g>
              );
            }
            return (
              <circle
                key={p.i}
                cx={p.x} cy={p.y} r={done ? 3.2 : 2.4}
                fill={done ? "var(--signal)" : "none"}
                stroke={done ? "none" : "var(--ink-3)"}
                strokeWidth="1"
                opacity={done ? 0.9 : 0.5}
              />
            );
          })}
        </svg>
      </motion.div>

      <div className="absolute bottom-3.5 right-4 z-10">
        <span className="data text-sm tabular-nums text-ink-2">{String(activeIdx + 1).padStart(2, "0")}/{String(n).padStart(2, "0")}</span>
      </div>
    </div>
  );
}
