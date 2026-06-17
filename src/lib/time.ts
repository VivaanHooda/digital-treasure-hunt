// Pure, dependency-free time math so it can be unit-tested in isolation.

export type TimeSettings = {
  startTime: Date;
  durationMs: number;
  isPaused: boolean;
  pausedAt: Date | null;
  totalPauseMs: number;
};

/**
 * Server-authoritative time computation. Accounts for an in-progress pause
 * (fixes the audit bug where the clock kept draining while "paused"): while
 * paused, the growing `now` is offset by the growing active-pause term, so the
 * remaining time holds steady.
 */
export function computeTime(settings: TimeSettings, now = Date.now()) {
  const start = settings.startTime.getTime();
  const hasStarted = now >= start;
  const activePauseMs =
    settings.isPaused && settings.pausedAt ? now - settings.pausedAt.getTime() : 0;
  const effectivePausedMs = settings.totalPauseMs + activePauseMs;
  const elapsed = Math.max(0, now - start - effectivePausedMs);
  return {
    hasStarted,
    timeRemaining: Math.max(0, settings.durationMs - elapsed),
    timeUntilStart: Math.max(0, start - now),
  };
}
