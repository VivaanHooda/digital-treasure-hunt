import { prisma } from "@/lib/prisma";

export type LeaderboardEntry = {
  rank: number;
  teamName: string;
  score: number;
  completedCount: number;
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
    isComplete: s.isComplete,
    lastCompletedAt: s.lastCompletedAt?.toISOString() ?? null,
  }));
}
