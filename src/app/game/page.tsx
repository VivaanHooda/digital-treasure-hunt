"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Crosshair, Loader2, AlertCircle, ArrowUpRight } from "lucide-react";
import { useGameState, useVerify, useSkip, useTeam } from "@/hooks/useGame";
import { useDynamicIsland } from "@/components/ui/DynamicIsland";
import { ClientError } from "@/lib/client";
import SkipHeartsDisplay from "@/components/SkipHeartsDisplay";
import { GameOverPopup, CountdownToStart } from "@/components/GameOverPopup";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { cn } from "@/lib/cn";
import { springHeavy, settle } from "@/lib/motion";

const pad2 = (n: number) => String(n).padStart(2, "0");
const formatTime = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${pad2(Math.floor(s / 3600))}:${pad2(Math.floor((s % 3600) / 60))}:${pad2(s % 60)}`;
};
const getPosition = (): Promise<GeolocationPosition> =>
  new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("Geolocation is not supported."));
    navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
  });

/** A minimal archive panel for non-field states (paused, complete, missing). */
function ArchiveNotice({
  tag,
  title,
  body,
  action,
}: {
  tag: string;
  title: string;
  body: string;
  action: { label: string; onClick: () => void };
}) {
  return (
    <div className="flex min-h-dvh items-center justify-center px-6">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={settle} className="w-full max-w-lg text-center">
        <div className="label mb-6">{tag}</div>
        <h2 className="font-serif text-5xl text-ink sm:text-6xl">{title}</h2>
        <p className="mx-auto mt-6 max-w-md text-ink-2">{body}</p>
        <div className="mt-10 flex justify-center">
          <Button size="lg" noMagnet onClick={action.onClick}>{action.label}</Button>
        </div>
      </motion.div>
    </div>
  );
}

export default function GamePage() {
  const router = useRouter();
  const island = useDynamicIsland();
  const { data, isLoading } = useGameState();
  const { data: teamResp } = useTeam();
  const team = teamResp?.team;
  const verify = useVerify();
  const skip = useSkip();

  const [timeRemaining, setTimeRemaining] = useState(0);
  const [cooldown, setCooldown] = useState(0);
  const [untilStart, setUntilStart] = useState(0);
  const [successPopup, setSuccessPopup] = useState({ show: false, message: "" });
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);
  const [locating, setLocating] = useState(false);
  const [displayError, setDisplayError] = useState<string | null>(null);
  const endRef = useRef(0);
  const cdRef = useRef(0);
  const startRef = useRef(0);

  useEffect(() => {
    if (!data) return;
    endRef.current = Date.now() + data.settings.timeRemaining;
    cdRef.current = Date.now() + data.game.cooldownRemaining * 1000;
    startRef.current = Date.now() + data.settings.timeUntilStart;
  }, [data]);
  useEffect(() => {
    const t = setInterval(() => {
      setTimeRemaining(Math.max(0, endRef.current - Date.now()));
      setCooldown(Math.max(0, Math.ceil((cdRef.current - Date.now()) / 1000)));
      setUntilStart(Math.max(0, startRef.current - Date.now()));
    }, 250);
    return () => clearInterval(t);
  }, []);

  const onVerify = async () => {
    setDisplayError(null);
    setLocating(true);
    try {
      const pos = await getPosition();
      const result = await verify.mutateAsync({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy });
      if (result.correct) {
        setSuccessPopup({ show: true, message: `Target confirmed — you were ${result.distance}m from the mark.` });
        island.announce({ title: "File Declassified", detail: result.points ? `+${result.points} pts` : undefined });
      } else {
        setDisplayError(`Position unverified — ${result.distance}m from the target.`);
      }
    } catch (e) {
      setDisplayError(e instanceof ClientError ? e.message : e instanceof Error ? e.message : "Verification failed.");
    } finally {
      setLocating(false);
    }
  };

  const onSkip = async () => {
    setShowSkipConfirm(false);
    setDisplayError(null);
    try {
      await skip.mutateAsync();
    } catch (e) {
      setDisplayError(e instanceof ClientError ? e.message : "Could not waive this file.");
    }
  };

  if (isLoading || !data) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-6">
        <div className="flex flex-col items-center gap-4">
          <Crosshair className="h-6 w-6 animate-breathe text-signal" />
          <p className="label">Retrieving Dossier</p>
        </div>
      </div>
    );
  }

  const { settings, game, challenge } = data;
  const score = game.score;
  // Use the live countdown only once it's been seeded from server data; before
  // that, fall back to the server's own value so we don't briefly read 0 and
  // flash the "time expired" screen on every navigation to the game tab.
  const liveRemaining = endRef.current > 0 ? Math.max(0, endRef.current - Date.now()) : settings.timeRemaining;
  const gameTimeUp = settings.hasStarted && settings.isActive && !game.isComplete && liveRemaining <= 0;

  if (gameTimeUp) {
    return (
      <GameOverPopup
        score={score}
        completedCount={game.completedCount}
        picturesCompleted={game.picturesCompleted}
        riddlesCompleted={game.riddlesCompleted}
        skipsUsed={game.skipsUsed}
        skipPenalty={game.skipPenalty}
        isComplete={false}
        onClose={() => router.push("/leaderboard")}
      />
    );
  }
  if (!settings.hasStarted && untilStart > 0) {
    return <CountdownToStart startTimeMs={startRef.current} />;
  }
  if (!settings.isActive || settings.isPaused) {
    return (
      <ArchiveNotice
        tag="Operation Held"
        title="Mission Suspended"
        body="The operation has been temporarily held by mission control. Standby for clearance."
        action={{ label: "Return to Control", onClick: () => router.push("/dashboard") }}
      />
    );
  }
  if (game.isComplete) {
    return (
      <ArchiveNotice
        tag="Operation Complete"
        title="All Files Declassified"
        body={`Every assignment is closed. Final operation score: ${score}.`}
        action={{ label: "View Standings", onClick: () => router.push("/leaderboard") }}
      />
    );
  }
  if (!challenge) {
    return (
      <ArchiveNotice
        tag="Error"
        title="Dossier Unavailable"
        body="The requested file could not be retrieved from the archive."
        action={{ label: "Return to Control", onClick: () => router.push("/dashboard") }}
      />
    );
  }

  const isPicture = challenge.type === "PICTURE";

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      {/* Status header — clearance + inline skip on the left, time on the right */}
      <header className="shrink-0 border-b border-line bg-paper">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-2.5">
          <div className="flex items-center gap-3">
            <SkipHeartsDisplay skipsRemaining={game.remainingSkips} maxSkips={game.maxSkips} />
            <button
              onClick={() => setShowSkipConfirm(true)}
              disabled={game.remainingSkips <= 0 || skip.isPending}
              className="flex items-center gap-1.5 rounded-md border border-line-strong px-2.5 py-1 text-xs text-ink-2 transition-colors hover:border-ink-3 hover:text-ink disabled:opacity-40"
            >
              Skip <span className="data text-alert">−{game.skipPenalty}</span>
            </button>
          </div>
          <div className="flex flex-col items-end">
            <span className="label leading-none">Time</span>
            <span className="data mt-0.5 text-sm tabular-nums text-signal">{formatTime(timeRemaining)}</span>
          </div>
        </div>
      </header>

      {/* The dossier — fills the viewport; only the briefing scrolls if long */}
      <AnimatePresence mode="wait">
        <motion.main
          key={challenge.number}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={springHeavy}
          className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col px-5 pb-[5.25rem] pt-4"
        >
          {/* Dossier header */}
          <div className="shrink-0 border-b border-line pb-3">
            <div className="label mb-1.5">File {pad2(challenge.number)} · {challenge.type}</div>
            <div className="flex items-baseline justify-between gap-4">
              <h1 className="line-clamp-2 font-serif text-2xl leading-[1.05] text-ink sm:text-4xl">{challenge.title}</h1>
              <div className="shrink-0 text-right">
                <div className="data text-2xl tabular-nums text-signal">{challenge.points}</div>
                <div className="label">pts</div>
              </div>
            </div>
          </div>

          {/* Briefing (+ evidence) — the only scrollable region */}
          <div className="min-h-0 flex-1 overflow-y-auto py-3">
            <div className="label mb-2">Briefing</div>
            <p className="text-base leading-relaxed text-ink">{challenge.description}</p>
            {isPicture && challenge.imageUrl && (
              <div className="relative mt-4 overflow-hidden rounded-xl border border-line-strong">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={challenge.imageUrl} alt={challenge.title} className="max-h-[26vh] w-full object-cover" />
                <span className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 border-l border-t border-signal/70" />
                <span className="pointer-events-none absolute bottom-2.5 right-2.5 h-3.5 w-3.5 border-b border-r border-signal/70" />
                <span className="data pointer-events-none absolute bottom-2.5 left-2.5 bg-paper/70 px-1.5 py-0.5 text-[10px] text-ink-2">EXH·A</span>
              </div>
            )}
          </div>

          {/* Confirm position — adaptive triangulation scanner */}
          <div className="flex shrink-0 flex-col items-center pt-2 text-center">
            <p className="data text-xs text-ink-2">
              Target within <span className="text-ink">±{challenge.marginOfError}m</span>
            </p>
            <button
              onClick={onVerify}
              disabled={locating || verify.isPending || cooldown > 0}
              aria-label="Verify your location"
              className="group relative mt-3 grid h-[min(32vw,7.5rem)] w-[min(32vw,7.5rem)] place-items-center rounded-full disabled:cursor-not-allowed"
            >
              <span className="absolute inset-0 rounded-full border border-line" />
              <span className="absolute inset-4 rounded-full border border-line" />
              {(locating || verify.isPending) && <span className="absolute inset-0 animate-ping rounded-full border border-signal/40" />}
              <span
                className={cn(
                  "relative grid h-[min(20vw,4.75rem)] w-[min(20vw,4.75rem)] place-items-center rounded-full border bg-signal/5 transition-all duration-200",
                  cooldown > 0 ? "border-line-strong" : "border-signal/50 group-hover:bg-signal/10 group-active:scale-95",
                )}
              >
                {locating || verify.isPending ? (
                  <Loader2 className="h-6 w-6 animate-spin text-signal" />
                ) : cooldown > 0 ? (
                  <span className="data text-xl tabular-nums text-ink-2">{cooldown}s</span>
                ) : (
                  <Crosshair className="h-6 w-6 text-signal" />
                )}
              </span>
            </button>
            <span className="label mt-3">
              {locating || verify.isPending ? "Triangulating Position" : cooldown > 0 ? "System Cooldown" : "Tap to Verify Location"}
            </span>
            <AnimatePresence>
              {displayError && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={settle}
                  className="mt-3 flex items-start gap-2 border-l-2 border-alert pl-3 text-left"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-alert" />
                  <p className="text-xs text-ink-2">{displayError}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Operational footer */}
          <section className="mt-4 grid shrink-0 grid-cols-3 gap-x-6 border-t border-line pt-3">
            {[
              ["Score", String(score)],
              ["Pictures", `${game.picturesCompleted}/${game.pictureTotal}`],
              ["Riddles", `${game.riddlesCompleted}/${game.riddleTotal}`],
            ].map(([label, value]) => (
              <div key={label} className="flex flex-col gap-1 py-1">
                <span className="label">{label}</span>
                <span className="data text-base tabular-nums text-ink">{value}</span>
              </div>
            ))}
          </section>
        </motion.main>
      </AnimatePresence>

      {/* Waive confirmation — a rising file, not a modal box */}
      <Sheet open={showSkipConfirm} onClose={() => setShowSkipConfirm(false)}>
        <div className="pb-6">
          <div className="label mb-4">Skip File</div>
          <h2 className="font-serif text-3xl text-ink">Skip this assignment?</h2>
          <p className="mt-4 text-ink-2">
            Skipping <span className="text-ink">“{challenge.title}”</span> spends one clearance token and deducts{" "}
            <span className="text-alert">{game.skipPenalty} points</span>.
          </p>
          <div className="mt-8 flex gap-3">
            <Button variant="ghost" size="lg" className="flex-1" noMagnet onClick={() => setShowSkipConfirm(false)}>
              Cancel
            </Button>
            <Button variant="alert" size="lg" className="flex-1" noMagnet onClick={onSkip}>
              Skip · −{game.skipPenalty}
            </Button>
          </div>
        </div>
      </Sheet>

      {/* Declassified — the archive reorganizes around a confirmed file */}
      <AnimatePresence>
        {successPopup.show && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={settle}
            className="fixed inset-0 z-50 flex items-center justify-center bg-paper/85 px-6 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={springHeavy}
              className="w-full max-w-md text-center"
            >
              <div className="label mb-6 !text-signal">Position Confirmed</div>
              <h2 className="font-serif text-5xl text-ink sm:text-6xl">Declassified</h2>
              <p className="mx-auto mt-6 max-w-sm text-ink-2">{successPopup.message}</p>
              <div className="mt-10 flex justify-center">
                <Button size="lg" onClick={() => setSuccessPopup({ show: false, message: "" })}>
                  Next File <ArrowUpRight className="h-5 w-5" />
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
