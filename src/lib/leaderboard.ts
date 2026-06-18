import { prisma } from "@/lib/prisma";

export type LeaderboardEntry = {
  rank: number;
  teamName: string;
  score: number;
  completedCount: number;
  total: number;
  isComplete: boolean;
  lastCompletedAt: string | null;
};

/**
 * Public leaderboard. Returns ONLY display fields — never emails, phone
 * numbers, or member lists (audit H2). Admin has no GameState, so is excluded.
 * Ordered by score desc, then earliest completion time (NULLS LAST).
 */
export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  const states = await prisma.gameState.findMany({
    where: { OR: [{ score: { gt: 0 } }, { completions: { some: {} } }] },
    select: {
      score: true,
      isComplete: true,
      lastCompletedAt: true,
      challengeIds: true,
      user: { select: { team: { select: { teamName: true } } } },
      _count: { select: { completions: true } },
    },
    orderBy: [
      { score: "desc" },
      { lastCompletedAt: { sort: "asc", nulls: "last" } },
    ],
    take: 100,
  });

  return states.map((s, i) => ({
    rank: i + 1,
    teamName: s.user.team?.teamName ?? "Unknown Team",
    score: s.score,
    completedCount: s._count.completions,
    total: s.challengeIds.length,
    isComplete: s.isComplete,
    lastCompletedAt: s.lastCompletedAt?.toISOString() ?? null,
  }));
}

export type TeamMomentum = {
  teamName: string;
  /** Cumulative score sampled at SPARK_SAMPLES points over a shared axis. */
  spark: number[];
  /** Points gained within the recent window (default last hour). "+140 today". */
  recentGain: number;
};

export type MomentumResponse = {
  teams: TeamMomentum[];
  /** Shared time axis the sparks are sampled over (ms epoch). */
  from: number;
  to: number;
  /** Width of the recent-gain window, ms. */
  windowMs: number;
};

const SPARK_SAMPLES = 16;
const RECENT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

type ScoreEvent = { at: number; delta: number };

/**
 * Per-team score momentum, derived entirely from existing Completion / Skip
 * rows — no schema change. Builds a cumulative-score series for each team on a
 * shared time axis (so sparklines are comparable) plus a recent-gain delta.
 * Pure read; additive endpoint.
 */
export async function getMomentum(windowMs = RECENT_WINDOW_MS): Promise<MomentumResponse> {
  const states = await prisma.gameState.findMany({
    where: { OR: [{ score: { gt: 0 } }, { completions: { some: {} } }] },
    select: {
      user: { select: { team: { select: { teamName: true } } } },
      completions: { select: { pointsAwarded: true, completedAt: true } },
      skips: { select: { penalty: true, skippedAt: true } },
    },
    take: 100,
  });

  // Collect signed score events per team and find the global time window.
  const perTeam = new Map<string, ScoreEvent[]>();
  let minAt = Infinity;
  let maxAt = -Infinity;

  for (const s of states) {
    const teamName = s.user.team?.teamName ?? "Unknown Team";
    const events: ScoreEvent[] = [];
    for (const c of s.completions) {
      const at = c.completedAt.getTime();
      events.push({ at, delta: c.pointsAwarded });
      if (at < minAt) minAt = at;
      if (at > maxAt) maxAt = at;
    }
    for (const k of s.skips) {
      const at = k.skippedAt.getTime();
      events.push({ at, delta: -k.penalty });
      if (at < minAt) minAt = at;
      if (at > maxAt) maxAt = at;
    }
    events.sort((a, b) => a.at - b.at);
    perTeam.set(teamName, events);
  }

  const now = Date.now();
  const from = Number.isFinite(minAt) ? minAt : now - windowMs;
  const to = Math.max(now, Number.isFinite(maxAt) ? maxAt : now);
  const span = Math.max(1, to - from);

  const cumulativeAt = (events: ScoreEvent[], t: number) => {
    let sum = 0;
    for (const e of events) {
      if (e.at <= t) sum += e.delta;
      else break;
    }
    return sum;
  };

  const teams: TeamMomentum[] = [...perTeam.entries()].map(([teamName, events]) => {
    const spark = Array.from({ length: SPARK_SAMPLES }, (_, i) => {
      const t = from + (span * i) / (SPARK_SAMPLES - 1);
      return cumulativeAt(events, t);
    });
    const recentGain = cumulativeAt(events, to) - cumulativeAt(events, to - windowMs);
    return { teamName, spark, recentGain };
  });

  return { teams, from, to, windowMs };
}
