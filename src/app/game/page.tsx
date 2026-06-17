"use client";

import { useEffect, useRef, useState } from "react";
import {
  MapPin, SkipForward, Clock, Trophy, CheckCircle, XCircle, Loader2, Pause, AlertTriangle,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useGameState, useVerify, useSkip } from "@/hooks/useGame";
import { ClientError } from "@/lib/client";

function formatHMS(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = String(Math.floor(s / 3600)).padStart(2, "0");
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const sec = String(s % 60).padStart(2, "0");
  return `${h}:${m}:${sec}`;
}

function getPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("Geolocation is not supported."));
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    });
  });
}

export default function GamePage() {
  const { data, isLoading, error } = useGameState();
  const verify = useVerify();
  const skip = useSkip();

  const [timeLeft, setTimeLeft] = useState(0);
  const [cooldown, setCooldown] = useState(0);
  const [untilStart, setUntilStart] = useState(0);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [locating, setLocating] = useState(false);
  const [confirmSkip, setConfirmSkip] = useState(false);
  const endRef = useRef(0);
  const cooldownEndRef = useRef(0);
  const startRef = useRef(0);

  // Sync local countdowns from server-authoritative values whenever data changes.
  useEffect(() => {
    if (!data) return;
    const now = Date.now();
    endRef.current = now + data.settings.timeRemaining;
    cooldownEndRef.current = now + data.game.cooldownRemaining * 1000;
    startRef.current = now + data.settings.timeUntilStart;
  }, [data]);

  useEffect(() => {
    const t = setInterval(() => {
      setTimeLeft(Math.max(0, endRef.current - Date.now()));
      setCooldown(Math.max(0, Math.ceil((cooldownEndRef.current - Date.now()) / 1000)));
      setUntilStart(Math.max(0, startRef.current - Date.now()));
    }, 250);
    return () => clearInterval(t);
  }, []);

  const onVerify = async () => {
    setFeedback(null);
    setLocating(true);
    try {
      const pos = await getPosition();
      const result = await verify.mutateAsync({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
      });
      if (result.correct) {
        setFeedback({ ok: true, text: `Correct! You were ${result.distance}m away. +${result.points ?? 0} points` });
      } else {
        setFeedback({ ok: false, text: `Not quite — you are ${result.distance}m away. Try again in ${result.cooldownRemaining}s.` });
      }
    } catch (e) {
      const msg = e instanceof ClientError ? e.message : e instanceof Error ? e.message : "Something went wrong.";
      setFeedback({ ok: false, text: msg });
    } finally {
      setLocating(false);
    }
  };

  const onSkip = async () => {
    setConfirmSkip(false);
    setFeedback(null);
    try {
      await skip.mutateAsync();
      setFeedback({ ok: true, text: "Challenge skipped." });
    } catch (e) {
      setFeedback({ ok: false, text: e instanceof ClientError ? e.message : "Could not skip." });
    }
  };

  if (isLoading) {
    return (
      <AppShell>
        <Centered><Loader2 className="h-8 w-8 animate-spin text-cyan-400" /></Centered>
      </AppShell>
    );
  }

  if (error || !data) {
    return (
      <AppShell>
        <Centered>
          <p className="text-gray-300">Could not load your game. Please refresh.</p>
        </Centered>
      </AppShell>
    );
  }

  const { settings, game, challenge } = data;
  const gameOver = game.isComplete || (settings.hasStarted && timeLeft <= 0);

  return (
    <AppShell>
      {/* Status bar */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        <StatusCard icon={<Trophy className="text-yellow-400" />} label="Score" value={String(game.score)} />
        <StatusCard icon={<MapPin className="text-cyan-400" />} label="Progress" value={`${game.completedCount}/${game.total}`} />
        <StatusCard icon={<Clock className="text-green-400" />} label="Time Left" value={formatHMS(timeLeft)} />
      </div>

      {!settings.hasStarted ? (
        <Banner icon={<Clock />} tone="orange" title="The hunt hasn't started yet">
          Starting in {formatHMS(untilStart)}
        </Banner>
      ) : settings.isPaused ? (
        <Banner icon={<Pause />} tone="orange" title="Game paused by the organizers">
          Hang tight — it will resume shortly.
        </Banner>
      ) : gameOver ? (
        <Banner icon={<Trophy />} tone="cyan" title={game.isComplete ? "All challenges complete!" : "Time's up!"}>
          Final score: <span className="font-bold">{game.score}</span>. Check the leaderboard!
        </Banner>
      ) : challenge ? (
        <div className="rounded-2xl border border-gray-700/50 bg-gray-800/30 p-6 backdrop-blur-xl">
          <div className="mb-3 flex items-center justify-between">
            <span className="rounded-full bg-cyan-500/20 px-3 py-1 text-xs font-medium uppercase tracking-wide text-cyan-300">
              {challenge.type} · #{challenge.number}/{challenge.total}
            </span>
            <span className="text-sm text-gray-400">{challenge.points} pts · within {challenge.marginOfError}m</span>
          </div>

          <h2 className="mb-2 text-xl font-bold text-white">{challenge.title}</h2>
          <p className="mb-4 text-gray-300">{challenge.description}</p>

          {challenge.imageUrl && (
            <div className="relative mb-4 h-64 w-full overflow-hidden rounded-xl bg-gray-900">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={challenge.imageUrl} alt="Challenge" className="h-full w-full object-cover" />
            </div>
          )}

          {feedback && (
            <div
              className={`mb-4 flex items-center gap-2 rounded-xl border p-3 text-sm ${
                feedback.ok
                  ? "border-green-500/50 bg-green-500/10 text-green-300"
                  : "border-red-500/50 bg-red-500/10 text-red-300"
              }`}
            >
              {feedback.ok ? <CheckCircle className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
              {feedback.text}
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              onClick={onVerify}
              disabled={locating || verify.isPending || cooldown > 0}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 py-3.5 font-semibold text-white transition hover:from-cyan-600 hover:to-blue-700 disabled:opacity-50"
            >
              {locating || verify.isPending ? (
                <><Loader2 className="h-5 w-5 animate-spin" /> Checking location...</>
              ) : cooldown > 0 ? (
                <>Wait {cooldown}s</>
              ) : (
                <><MapPin className="h-5 w-5" /> Verify Location</>
              )}
            </button>

            <button
              onClick={() => setConfirmSkip(true)}
              disabled={game.remainingSkips <= 0 || skip.isPending}
              className="flex items-center justify-center gap-2 rounded-xl bg-orange-600/80 px-5 py-3.5 font-semibold text-white transition hover:bg-orange-600 disabled:opacity-50"
            >
              <SkipForward className="h-5 w-5" />
              Skip ({game.remainingSkips} left)
            </button>
          </div>
        </div>
      ) : (
        <Banner icon={<Trophy />} tone="cyan" title="Nothing to solve right now">
          You&apos;re all caught up.
        </Banner>
      )}

      {/* Skip confirmation */}
      {confirmSkip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-orange-500/50 bg-gray-800 p-6 text-center">
            <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-orange-400" />
            <h3 className="mb-2 text-lg font-bold text-white">Skip this challenge?</h3>
            <p className="mb-5 text-sm text-gray-300">
              You&apos;ll lose {game.skipPenalty} points and one of your {game.remainingSkips} remaining skips.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmSkip(false)} className="flex-1 rounded-xl bg-gray-600 py-3 font-semibold text-white hover:bg-gray-700">
                Cancel
              </button>
              <button onClick={onSkip} className="flex-1 rounded-xl bg-orange-600 py-3 font-semibold text-white hover:bg-orange-700">
                Skip
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function StatusCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-700/50 bg-gray-800/30 p-3 text-center backdrop-blur-xl">
      <div className="mx-auto mb-1 h-5 w-5">{icon}</div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-lg font-bold text-white">{value}</p>
    </div>
  );
}

function Banner({
  icon, tone, title, children,
}: { icon: React.ReactNode; tone: "orange" | "cyan"; title: string; children: React.ReactNode }) {
  const tones = {
    orange: "border-orange-500/40 bg-orange-500/10 text-orange-200",
    cyan: "border-cyan-500/40 bg-cyan-500/10 text-cyan-100",
  };
  return (
    <div className={`rounded-2xl border p-8 text-center ${tones[tone]}`}>
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center">{icon}</div>
      <h2 className="mb-1 text-xl font-bold">{title}</h2>
      <p className="text-sm opacity-90">{children}</p>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-[40vh] items-center justify-center">{children}</div>;
}
