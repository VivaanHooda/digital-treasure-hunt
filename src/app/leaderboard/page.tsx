"use client";

import { Trophy, Crown, Medal, Loader2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useLeaderboard } from "@/hooks/useGame";

const rankBadge = (rank: number) => {
  if (rank === 1) return <Crown className="h-5 w-5 text-yellow-400" />;
  if (rank === 2) return <Medal className="h-5 w-5 text-gray-300" />;
  if (rank === 3) return <Medal className="h-5 w-5 text-amber-600" />;
  return <span className="text-sm font-semibold text-gray-400">#{rank}</span>;
};

export default function LeaderboardPage() {
  const { data, isLoading } = useLeaderboard();
  const entries = data?.entries ?? [];

  return (
    <AppShell>
      <div className="mb-6 flex items-center gap-3">
        <Trophy className="h-7 w-7 text-yellow-400" />
        <h1 className="text-2xl font-bold text-white">Leaderboard</h1>
        <span className="ml-auto flex items-center gap-1 text-xs text-green-400">
          <span className="h-2 w-2 animate-pulse rounded-full bg-green-400" /> Live
        </span>
      </div>

      {isLoading ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
        </div>
      ) : entries.length === 0 ? (
        <p className="rounded-2xl border border-gray-700/50 bg-gray-800/30 p-8 text-center text-gray-400">
          No teams on the board yet. Be the first!
        </p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-700/50 bg-gray-800/30 backdrop-blur-xl">
          <table className="w-full text-left">
            <thead className="border-b border-gray-700/50 text-xs uppercase tracking-wide text-gray-400">
              <tr>
                <th className="px-4 py-3">Rank</th>
                <th className="px-4 py-3">Team</th>
                <th className="px-4 py-3 text-right">Completed</th>
                <th className="px-4 py-3 text-right">Score</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.rank} className="border-b border-gray-700/30 last:border-0 hover:bg-gray-700/20">
                  <td className="px-4 py-3">
                    <span className="flex h-6 w-8 items-center">{rankBadge(e.rank)}</span>
                  </td>
                  <td className="px-4 py-3 font-medium text-white">
                    {e.teamName}
                    {e.isComplete && (
                      <span className="ml-2 rounded-full bg-green-500/20 px-2 py-0.5 text-xs text-green-300">Done</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-300">{e.completedCount}</td>
                  <td className="px-4 py-3 text-right font-bold text-cyan-300">{e.score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}
