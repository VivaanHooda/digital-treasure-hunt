"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { RefreshCw } from "lucide-react";
import { useLeaderboard, useMomentum } from "@/hooks/useGame";
import { cn } from "@/lib/cn";
import { spring, staggerContainer, revealVariants } from "@/lib/motion";

const pad2 = (n: number) => String(n).padStart(2, "0");
const isLive = (iso: string | null) => !!iso && Date.now() - new Date(iso).getTime() < 300000;

export default function LeaderboardPage() {
  const { data, isLoading, isFetching, refetch, dataUpdatedAt } = useLeaderboard();
  const { data: momentum } = useMomentum();
  const meId = data?.meId ?? null;

  const entries = data?.entries ?? [];
  const topScore = entries[0]?.score ?? 0;

  // Keyed by GameState id — team names are not unique.
  const momentumByTeam = useMemo(() => {
    const m = new Map<string, { recentGain: number }>();
    momentum?.teams.forEach((t) => m.set(t.id, { recentGain: t.recentGain }));
    return m;
  }, [momentum]);

  // Tick once a second so the "synced … ago" clock stays live between refetches.
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const syncedAgo = dataUpdatedAt > 0 ? Math.max(0, Math.round((Date.now() - dataUpdatedAt) / 1000)) : null;

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-6">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="h-6 w-6 animate-spin text-signal" />
          <p className="label">Compiling Standings</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <motion.main variants={staggerContainer} initial="hidden" animate="show" className="mx-auto w-full max-w-3xl px-5 pb-36 pt-[max(2rem,var(--safe-top))]">
        <motion.header variants={revealVariants} className="flex items-end justify-between gap-4 border-b border-line pb-6">
          <div>
            <div className="label mb-3 flex items-center gap-2">
              <span className="h-1.5 w-1.5 animate-breathe rounded-full bg-signal" /> Live · Field Units
            </div>
            <h1 className="font-serif text-5xl text-ink sm:text-6xl">Standings</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="data text-3xl tabular-nums text-signal">{pad2(entries.length)}</div>
              <div className="label mt-1">Units</div>
            </div>
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              aria-label="Refresh standings"
              className="rounded-lg p-2 text-ink-3 transition-colors hover:bg-paper-2 hover:text-ink disabled:opacity-50"
            >
              <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
            </button>
          </div>
        </motion.header>

        {entries.length === 0 ? (
          <motion.div variants={revealVariants} className="py-24 text-center">
            <p className="label">No Units Deployed</p>
            <p className="mt-3 text-ink-2">Be the first to log a confirmed position.</p>
          </motion.div>
        ) : (
          <motion.ol layout className="mt-2">
            {entries.map((team) => {
              const isCurrent = !!meId && team.id === meId;
              const live = isLive(team.lastCompletedAt);
              const mo = momentumByTeam.get(team.id);

              return (
                <motion.li
                  layout
                  layoutId={team.id}
                  key={team.id}
                  transition={spring}
                  className={cn(
                    "relative grid grid-cols-[2.5rem_1fr_auto] items-center gap-4 py-5",
                    isCurrent
                      ? "-mx-3 my-1.5 rounded-2xl border border-signal/40 bg-signal-soft px-3"
                      : "border-b border-line",
                  )}
                >
                  {/* rank */}
                  <div className="flex flex-col items-center">
                    <span className={cn("data text-2xl tabular-nums", team.rank <= 3 || isCurrent ? "text-signal" : "text-ink-2")}>
                      {pad2(team.rank)}
                    </span>
                    <span className={cn("mt-1 h-1.5 w-1.5 rounded-full", team.isComplete ? "bg-ok" : live ? "animate-breathe bg-signal" : "bg-ink-3")} />
                  </div>

                  {/* identity */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2.5">
                      <h3 className="truncate font-serif text-2xl text-ink">{team.teamName}</h3>
                      {isCurrent && (
                        <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.18em] text-signal">
                          Your Unit
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-3">
                      <span className="data text-xs text-ink-3">{team.completedCount}/{team.total} solved</span>
                      {mo && mo.recentGain > 0 && <span className="data text-xs text-signal">▲ +{mo.recentGain}</span>}
                    </div>
                  </div>

                  {/* score */}
                  <div className="text-right">
                    <div className="data text-2xl tabular-nums text-ink">{team.score}</div>
                    <div className="label mt-0.5">pts</div>
                  </div>
                </motion.li>
              );
            })}
          </motion.ol>
        )}

        {/* Operational summary */}
        <motion.section variants={revealVariants} className="mt-12 grid grid-cols-3 gap-x-6 border-t border-line pt-6">
          {[
            ["Units", pad2(entries.length)],
            ["Top Score", String(topScore)],
            ["Completed", pad2(entries.filter((e) => e.isComplete).length)],
          ].map(([label, value]) => (
            <div key={label} className="border-l border-line pl-3">
              <span className="label block">{label}</span>
              <span className="data mt-1 block text-xl tabular-nums text-ink">{value}</span>
            </div>
          ))}
        </motion.section>

        {syncedAgo !== null && (
          <p className="label mt-8 flex items-center justify-center gap-2 !text-ink-3">
            <span className="h-1.5 w-1.5 animate-breathe rounded-full bg-signal" />
            Live · synced {syncedAgo === 0 ? "now" : `${syncedAgo}s ago`}
          </p>
        )}
      </motion.main>
    </>
  );
}
