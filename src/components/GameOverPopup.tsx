"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { springHeavy, settle } from "@/lib/motion";

const pad2 = (n: number) => String(n).padStart(2, "0");

export function GameOverPopup({
  score,
  completedCount,
  picturesCompleted,
  riddlesCompleted,
  skipsUsed,
  skipPenalty = 5,
  isComplete = false,
  onClose,
}: {
  score: number;
  completedCount: number;
  picturesCompleted: number;
  riddlesCompleted: number;
  skipsUsed: number;
  skipPenalty?: number;
  isComplete?: boolean;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-paper/80 px-5 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={springHeavy}
        className="relative w-full max-w-lg rounded-3xl border border-line-strong bg-paper-2 p-8 shadow-sheet sm:p-10"
      >
        <div className="label mb-6">{isComplete ? "Operation Debrief" : "Operation Terminated"}</div>
        <h2 className="font-serif text-5xl leading-none text-ink sm:text-6xl">
          {isComplete ? "Mission Complete" : "Time Expired"}
        </h2>

        <div className="mt-8 flex items-baseline gap-4 border-t border-line pt-8">
          <span className="data text-7xl tabular-nums text-signal">{score}</span>
          <span className="label pb-2">Final Score</span>
        </div>

        <dl className="mt-6 grid grid-cols-4 gap-x-6 border-t border-line pt-6">
          {[
            ["Solved", completedCount],
            ["Pictures", picturesCompleted],
            ["Riddles", riddlesCompleted],
            ["Skips", skipsUsed],
          ].map(([label, value]) => (
            <div key={label as string} className="flex flex-col gap-1.5">
              <dt className="label">{label as string}</dt>
              <dd className="data text-2xl tabular-nums text-ink">{value as number}</dd>
            </div>
          ))}
        </dl>

        {skipsUsed > 0 && (
          <p className="label mt-6 !text-alert">
            Penalty · {skipsUsed} clearance{skipsUsed > 1 ? "s" : ""} used · −{skipsUsed * skipPenalty} pts
          </p>
        )}

        <Button size="lg" className="mt-8 w-full" noMagnet onClick={onClose}>
          View Standings
        </Button>
      </motion.div>
    </div>
  );
}

export function CountdownToStart({ startTimeMs, onGameStart }: { startTimeMs: number; onGameStart?: () => void }) {
  const [remaining, setRemaining] = useState(Math.max(0, startTimeMs - Date.now()));
  useEffect(() => {
    const t = setInterval(() => {
      const r = Math.max(0, startTimeMs - Date.now());
      setRemaining(r);
      if (r <= 0) onGameStart?.();
    }, 1000);
    return () => clearInterval(t);
  }, [startTimeMs, onGameStart]);

  const fmt = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (d > 0) return `${d}:${pad2(h)}:${pad2(m)}:${pad2(sec)}`;
    return `${pad2(h)}:${pad2(m)}:${pad2(sec)}`;
  };

  return (
    <div className="flex min-h-dvh items-center justify-center px-6">
      <motion.div
        initial="hidden"
        animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
        className="w-full max-w-xl text-center"
      >
        <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: settle } }} className="label mb-6">
          Clearance Pending
        </motion.div>
        <motion.h2 variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: settle } }} className="font-serif text-5xl text-ink sm:text-7xl">
          Standby for Briefing
        </motion.h2>
        <motion.p
          variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: settle } }}
          className="data mt-10 text-6xl tabular-nums text-signal sm:text-7xl"
        >
          {fmt(remaining)}
        </motion.p>
        <motion.p variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: settle } }} className="label mt-8">
          The operation begins automatically
        </motion.p>
      </motion.div>
    </div>
  );
}
