"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { ChevronDown, Radio, X } from "lucide-react";
import { useGameState, useTeam, useNotifications, useDismissNotification } from "@/hooks/useGame";
import { useEventStream } from "@/hooks/useEventStream";
import { useDynamicIsland } from "@/components/ui/DynamicIsland";
import { OperationsMap } from "@/components/ui/OperationsMap";
import { Sheet } from "@/components/ui/Sheet";
import { cn } from "@/lib/cn";
import { settle, staggerContainer, revealVariants } from "@/lib/motion";

const deptShort: Record<string, string> = {
  "Computer Science & Engineering (AIML)": "AIML",
  "Computer Science & Engineering": "CSE",
  "Computer Science & Engineering (Data Science)": "CD",
  "Computer Science & Engineering (Cyber Security)": "CY",
  "Electronics & Communication Engineering": "ECE",
  "Electrical & Electronics Engineering": "EEE",
  "Electronics & Telecommunication Engineering": "ET",
  "Mechanical Engineering": "ME",
  "Aerospace Engineering": "AS",
  "Chemical Engineering": "CH",
  "Civil Engineering": "CV",
  Biotechnology: "BT",
  "Industrial Engineering & Management": "IEM",
};
const short = (d?: string) => (d ? deptShort[d] ?? d : "—");
const pad2 = (n: number) => String(n).padStart(2, "0");
const formatClock = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${pad2(Math.floor(s / 3600))}:${pad2(Math.floor((s % 3600) / 60))}:${pad2(s % 60)}`;
};

/** HUD readout — a framed operational datum, not a card. */
function Readout({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="relative border-l border-line pl-3">
      <span className="label block">{label}</span>
      <span className={cn("data mt-1 block text-lg tabular-nums sm:text-xl", accent ? "text-signal" : "text-ink")}>{value}</span>
    </div>
  );
}

export default function DashboardPage() {
  useEventStream(true);
  const router = useRouter();
  const { data: session, status } = useSession();
  const island = useDynamicIsland();

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role === "ADMIN") router.replace("/admin");
  }, [status, session, router]);

  const { data, isLoading } = useGameState();
  const { data: teamResp } = useTeam();
  const team = teamResp?.team;

  const [animatedScore, setAnimatedScore] = useState(0);
  const [showRoster, setShowRoster] = useState(false);
  const [showAllLog, setShowAllLog] = useState(false);
  const [showTransmissions, setShowTransmissions] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [timeUntilStart, setTimeUntilStart] = useState(0);
  const endRef = useRef(0);
  const startRef = useRef(0);

  const { data: notifResp } = useNotifications();
  const notifications = notifResp?.notifications ?? [];
  const dismiss = useDismissNotification();

  useEffect(() => {
    if (!data) return;
    endRef.current = Date.now() + data.settings.timeRemaining;
    startRef.current = Date.now() + data.settings.timeUntilStart;
  }, [data]);
  useEffect(() => {
    const t = setInterval(() => {
      setTimeRemaining(Math.max(0, endRef.current - Date.now()));
      setTimeUntilStart(Math.max(0, startRef.current - Date.now()));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const target = data?.game.score ?? 0;
    let raf = 0;
    const start = Date.now();
    const from = animatedScore;
    const tick = () => {
      const p = Math.min((Date.now() - start) / 1200, 1);
      setAnimatedScore(Math.floor(from + (target - from) * p));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.game.score]);

  const prevRef = useRef<{ completed: number; score: number } | null>(null);
  useEffect(() => {
    if (!data) return;
    const cur = { completed: data.game.completedCount, score: data.game.score };
    const prev = prevRef.current;
    if (prev && cur.completed > prev.completed) {
      const gained = cur.score - prev.score;
      island.announce({ title: "Mission Updated", detail: gained > 0 ? `+${gained} pts` : undefined });
    }
    prevRef.current = cur;
  }, [data, island]);

  const prevNotif = useRef<string | null>(null);
  useEffect(() => {
    const latest = notifications[0];
    if (latest && latest.id !== prevNotif.current) {
      if (prevNotif.current !== null) island.announce({ title: "Incoming Transmission" });
      prevNotif.current = latest.id;
    }
  }, [notifications, island]);

  if (isLoading || !data) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-6">
        <div className="flex flex-col items-center gap-4">
          <Radio className="h-6 w-6 animate-breathe text-signal" />
          <p className="label">Establishing Uplink</p>
        </div>
      </div>
    );
  }

  const { settings, game, challenge } = data;
  const active = settings.isActive;
  const pct = game.total ? Math.round((game.completedCount / game.total) * 100) : 0;
  const processed = Math.max(0, game.currentNumber - 1);
  const pending = timeUntilStart > 0;
  // A team is genuinely finished only if they processed every file — not just
  // because the game was force-stopped (which flags isComplete to end play).
  const playedThrough = game.total > 0 && game.completedCount + game.skippedCount >= game.total;
  const ended = !active; // stopped/disarmed by command
  const missionTitle = pending
    ? "Standby for Briefing"
    : playedThrough
      ? "All Files Declassified"
      : ended
        ? "Operation Ended"
        : settings.isPaused
          ? "Operation Held"
          : challenge?.title ?? "Awaiting Assignment";

  const logEntries: { n: number; state: "active" | "declassified" }[] = [];
  if (!game.isComplete && active && !settings.isPaused && !pending && challenge) logEntries.push({ n: game.currentNumber, state: "active" });
  for (let n = processed; n >= 1; n--) logEntries.push({ n, state: "declassified" });
  const visibleLog = showAllLog ? logEntries : logEntries.slice(0, 3);

  return (
    <>
      <motion.main
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="mx-auto w-full max-w-4xl px-5 pb-36 pt-[max(2rem,var(--safe-top))]"
      >
        {/* Focal mission */}
        <motion.section variants={revealVariants}>
          <div className="label mb-4">{team?.teamName ? `Operative · ${team.teamName} · Clearance II` : "Current Mission"}</div>
          <div className="flex items-end justify-between gap-6">
            <div className="min-w-0">
              <div className="flex items-baseline gap-3">
                <span className="font-serif text-[20vw] leading-[0.8] tracking-tight text-ink sm:text-[8rem]">
                  {pending || ended || playedThrough ? "—" : pad2(game.currentNumber)}
                </span>
                <span className="label pb-3">Mission</span>
              </div>
              <h1 className="mt-3 max-w-lg font-serif text-3xl leading-[1.04] text-ink sm:text-5xl">{missionTitle}</h1>
            </div>
            <div className="shrink-0 text-right">
              <div className="data text-5xl leading-none tabular-nums text-signal sm:text-6xl">{pct}%</div>
              <div className="label mt-2">{game.completedCount}/{game.total} solved</div>
            </div>
          </div>
          {/* hairline progress with ticks */}
          <div className="relative mt-6 h-px w-full bg-line-strong">
            <motion.div className="absolute inset-y-0 left-0 bg-signal" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={settle} />
          </div>
        </motion.section>

        {/* Operations Map — the living centerpiece */}
        <motion.section variants={revealVariants} className="mt-8">
          <OperationsMap total={game.total} currentNumber={Math.max(1, game.currentNumber)} />
        </motion.section>

        {/* Operational telemetry */}
        <motion.section variants={revealVariants} className="mt-10 grid grid-cols-2 gap-y-5 sm:grid-cols-4">
          <Readout label="Score" value={String(animatedScore)} accent />
          <Readout label={pending ? "Begins In" : "Time Remaining"} value={formatClock(pending ? timeUntilStart : timeRemaining)} />
          <Readout label="Pictures" value={`${game.picturesCompleted}/${game.pictureTotal}`} />
          <Readout label="Riddles" value={`${game.riddlesCompleted}/${game.riddleTotal}`} />
        </motion.section>

        {/* Intelligence log */}
        <motion.section variants={revealVariants} className="mt-14">
          <div className="label mb-5">Intelligence Log</div>
          <ol className="relative ml-1.5 border-l border-line">
            {visibleLog.map((e) => (
              <li key={e.n} className="relative flex items-center gap-4 py-3.5 pl-6">
                <span className={cn("absolute -left-[5px] h-2.5 w-2.5 rounded-full ring-4 ring-paper", e.state === "active" ? "animate-breathe bg-signal" : "bg-ink-3")} />
                <span className="data w-16 tabular-nums text-ink-2">MSN {pad2(e.n)}</span>
                <span className={cn("label", e.state === "active" ? "!text-signal" : "!text-ink-3")}>
                  {e.state === "active" ? "Active — In Field" : "Declassified"}
                </span>
              </li>
            ))}
            {logEntries.length === 0 && <li className="label py-3.5 pl-6 !text-ink-3">No activity logged yet</li>}
          </ol>
          {logEntries.length > 3 && (
            <button
              onClick={() => setShowAllLog((v) => !v)}
              className="mt-2 flex w-full items-center justify-center gap-2 py-2 text-ink-3 transition-colors hover:text-ink"
              aria-label={showAllLog ? "Collapse log" : "Expand log"}
            >
              <span className="label">{showAllLog ? "Less" : `${logEntries.length - 3} more`}</span>
              <ChevronDown className={cn("h-4 w-4 transition-transform", showAllLog && "rotate-180")} />
            </button>
          )}
        </motion.section>

        {/* Field unit roster */}
        <motion.section variants={revealVariants} className="mt-14 border-t border-line pt-8">
          <button onClick={() => setShowRoster((v) => !v)} className="flex w-full items-center justify-between">
            <div className="text-left">
              <div className="label mb-2">Field Unit</div>
              <div className="font-serif text-2xl text-ink">{team?.teamName ?? "Unassigned"}</div>
            </div>
            <ChevronDown className={cn("h-5 w-5 text-ink-3 transition-transform", showRoster && "rotate-180")} />
          </button>
          <motion.div initial={false} animate={{ height: showRoster ? "auto" : 0, opacity: showRoster ? 1 : 0 }} transition={settle} className="overflow-hidden">
            <ul className="mt-5 divide-y divide-line">
              <li className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <div className="flex items-center"><span className="truncate text-ink">{team?.leaderName ?? "—"}</span><span className="label ml-3 !text-signal">Lead</span></div>
                  <a href={`tel:${team?.leaderMobile ?? ""}`} className="data mt-0.5 block text-xs text-ink-3 transition-colors hover:text-signal">{team?.leaderMobile ?? "—"}</a>
                </div>
                <span className="data shrink-0 text-sm text-ink-2">{short(team?.leaderDepartment)}</span>
              </li>
              {team?.members?.map((m, i) => (
                <li key={i} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <span className="truncate text-ink">{m.name}</span>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-3">
                      <a href={`tel:${m.mobile}`} className="data text-xs text-ink-3 transition-colors hover:text-signal">{m.mobile}</a>
                      {m.email && <a href={`mailto:${m.email}`} className="data truncate text-xs text-ink-3 transition-colors hover:text-signal">{m.email}</a>}
                    </div>
                  </div>
                  <span className="data shrink-0 text-sm text-ink-2">{short(m.department)}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        </motion.section>

        {/* Transmissions trigger */}
        <motion.button
          variants={revealVariants}
          onClick={() => setShowTransmissions(true)}
          className="mt-10 flex w-full items-center justify-between border-t border-line pt-6 text-left"
        >
          <span className="label">Secure Channel · Transmissions</span>
          <span className="data tabular-nums text-ink">{pad2(notifications.length)}</span>
        </motion.button>
      </motion.main>

      <Sheet open={showTransmissions} onClose={() => setShowTransmissions(false)}>
        <div className="flex items-center justify-between pb-6">
          <div>
            <div className="label mb-2">Secure Channel</div>
            <h2 className="font-serif text-3xl text-ink">Transmissions</h2>
          </div>
          <button onClick={() => setShowTransmissions(false)} className="rounded-full p-2 text-ink-3 hover:text-ink"><X className="h-5 w-5" /></button>
        </div>
        {notifications.length === 0 ? (
          <p className="label py-10 text-center">Channel Clear</p>
        ) : (
          <ul className="divide-y divide-line pb-4">
            {notifications.map((n) => (
              <li key={n.id} className="flex items-start justify-between gap-4 py-5">
                <div>
                  {n.title && <p className="text-ink">{n.title}</p>}
                  <p className="mt-1 text-sm text-ink-2">{n.message}</p>
                </div>
                <button onClick={() => dismiss.mutate(n.id)} className="mt-0.5 rounded-full p-1.5 text-ink-3 hover:text-ink"><X className="h-4 w-4" /></button>
              </li>
            ))}
          </ul>
        )}
      </Sheet>
    </>
  );
}
