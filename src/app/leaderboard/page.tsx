"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Trophy, Crown, Medal, Award, Users, ArrowLeft, RefreshCw, Clock } from "lucide-react";
import { useLeaderboard, useTeam } from "@/hooks/useGame";
import { useEventStream } from "@/hooks/useEventStream";

const rankIcon = (rank: number) => {
  if (rank === 1) return <Crown className="text-yellow-400 w-5 h-5 sm:w-6 sm:h-6" />;
  if (rank === 2) return <Medal className="text-gray-400 w-5 h-5 sm:w-6 sm:h-6" />;
  if (rank === 3) return <Award className="text-amber-600 w-5 h-5 sm:w-6 sm:h-6" />;
  return <div className="w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center bg-gray-600 rounded-full text-white text-xs sm:text-sm font-bold">{rank}</div>;
};
const rankColor = (rank: number) => {
  if (rank === 1) return "border-yellow-400 bg-yellow-400/10";
  if (rank === 2) return "border-gray-400 bg-gray-400/10";
  if (rank === 3) return "border-amber-600 bg-amber-600/10";
  return "border-gray-600 bg-gray-700/20";
};
const isLive = (iso: string | null) => !!iso && Date.now() - new Date(iso).getTime() < 300000;

export default function LeaderboardPage() {
  useEventStream(true);
  const router = useRouter();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";
  const { data, isLoading, isFetching, refetch, dataUpdatedAt } = useLeaderboard();
  const { data: teamResp } = useTeam();
  const myTeamName = teamResp?.team?.teamName;

  const entries = data?.entries ?? [];
  const completedTeams = entries.filter((e) => e.isComplete).length;
  const myRow = entries.find((e) => e.teamName === myTeamName);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 sm:h-16 sm:w-16 border-b-2 border-blue-500 mx-auto mb-4" />
          <p className="text-gray-300 text-sm sm:text-base">Loading leaderboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <nav className="bg-gray-800/50 backdrop-blur-md border-b border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16">
            <button onClick={() => router.push(isAdmin ? "/admin" : "/dashboard")} className="flex items-center text-gray-300 hover:text-white transition-colors text-sm sm:text-base">
              <ArrowLeft className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden xs:inline">{isAdmin ? "Admin Panel" : "Dashboard"}</span>
              <span className="xs:hidden">Back</span>
            </button>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg sm:text-xl font-bold text-white">Leaderboard</h1>
              {isAdmin && <span className="px-2 py-1 bg-red-500 text-white text-xs rounded-full">Admin</span>}
            </div>
            <button onClick={() => refetch()} disabled={isFetching} className="flex items-center px-2 sm:px-3 py-1 sm:py-2 text-gray-300 hover:text-white transition-colors disabled:opacity-50 text-sm sm:text-base">
              <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
              <span className="ml-1 sm:ml-2 hidden xs:inline">Refresh</span>
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
        <div className="text-center mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-2 sm:mb-4">Team Rankings</h2>
          <p className="text-gray-300 text-sm sm:text-base lg:text-lg mb-2 flex items-center justify-center gap-2">
            <span className="h-2 w-2 animate-pulse rounded-full bg-green-400" /> Live leaderboard
          </p>
          {dataUpdatedAt > 0 && <p className="text-gray-400 text-xs sm:text-sm">Last updated: {new Date(dataUpdatedAt).toLocaleTimeString()}</p>}
        </div>

        {entries.length === 0 ? (
          <div className="bg-gray-800/50 backdrop-blur-md rounded-xl p-8 sm:p-12 text-center border border-gray-700">
            <Users className="text-gray-400 mx-auto mb-4 w-10 h-10 sm:w-12 sm:h-12" />
            <h3 className="text-lg sm:text-xl font-bold text-white mb-2">No Teams Yet</h3>
            <p className="text-gray-400 text-sm sm:text-base">Be the first team to start the treasure hunt!</p>
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {entries.map((team) => {
              const isCurrent = !!myTeamName && team.teamName === myTeamName;
              const live = isLive(team.lastCompletedAt);
              return (
                <div key={team.rank} className={`bg-gray-800/50 backdrop-blur-md rounded-xl p-4 sm:p-6 border transition-all ${isCurrent ? "border-blue-400 bg-blue-400/10 ring-2 ring-blue-400/20" : rankColor(team.rank)}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 sm:space-x-4 min-w-0">
                      <div className="flex-shrink-0">{rankIcon(team.rank)}</div>
                      <div className="min-w-0">
                        <div className="flex items-center space-x-2">
                          <h3 className="text-base sm:text-lg font-bold text-white truncate">{team.teamName}</h3>
                          {isCurrent && <span className="px-2 py-0.5 bg-blue-500 text-white text-xs rounded-full whitespace-nowrap">You</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4 sm:space-x-8">
                      <div className="text-center"><p className="text-xl sm:text-2xl font-bold text-yellow-400">{team.score}</p><p className="text-gray-400 text-xs">Points</p></div>
                      <div className="text-center"><p className="text-base sm:text-lg font-semibold text-white">{team.completedCount}/{team.total}</p><p className="text-gray-400 text-xs">Completed</p></div>
                      <div className="text-center">
                        <div className={`w-3 h-3 rounded-full mx-auto ${team.isComplete ? "bg-green-400" : live ? "bg-blue-400" : "bg-gray-400"}`} />
                        <p className="text-gray-400 text-xs mt-1">{team.isComplete ? "Done" : live ? "Active" : "Idle"}</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 sm:mt-4">
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div className={`h-2 rounded-full transition-all duration-500 ${team.rank === 1 ? "bg-gradient-to-r from-yellow-400 to-yellow-600" : team.rank === 2 ? "bg-gradient-to-r from-gray-300 to-gray-500" : team.rank === 3 ? "bg-gradient-to-r from-amber-500 to-amber-700" : "bg-gradient-to-r from-blue-400 to-purple-500"}`} style={{ width: `${team.total ? (team.completedCount / team.total) * 100 : 0}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-6 mt-6 sm:mt-8">
          <SummaryCard icon={<Users className="text-blue-400 mx-auto mb-2 sm:mb-3 w-6 h-6 sm:w-8 sm:h-8" />} title="Total Teams" value={entries.length} color="text-blue-400" />
          <SummaryCard icon={<Trophy className="text-yellow-400 mx-auto mb-2 sm:mb-3 w-6 h-6 sm:w-8 sm:h-8" />} title="Top Score" value={entries[0]?.score ?? 0} color="text-yellow-400" />
          <SummaryCard icon={<Award className="text-green-400 mx-auto mb-2 sm:mb-3 w-6 h-6 sm:w-8 sm:h-8" />} title="Completed Teams" value={completedTeams} color="text-green-400" className="col-span-2 sm:col-span-1" />
        </div>

        {/* Your position */}
        {myTeamName && !isAdmin && (
          <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 backdrop-blur-md rounded-xl p-4 sm:p-6 border border-blue-500/30 mt-6 sm:mt-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-3 sm:space-y-0">
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-white mb-1 sm:mb-2">Your Team Position</h3>
                <p className="text-gray-300 text-sm sm:text-base">Team: {myTeamName}</p>
              </div>
              {myRow ? (
                <div className="flex items-center justify-center sm:justify-end space-x-4 sm:space-x-6">
                  <div className="text-center"><p className="text-lg sm:text-2xl font-bold text-white">#{myRow.rank}</p><p className="text-gray-400 text-xs sm:text-sm">Rank</p></div>
                  <div className="text-center"><p className="text-lg sm:text-2xl font-bold text-yellow-400">{myRow.score}</p><p className="text-gray-400 text-xs sm:text-sm">Score</p></div>
                  <div className="text-center"><p className="text-sm sm:text-lg font-semibold text-white">{myRow.completedCount}/{myRow.total}</p><p className="text-gray-400 text-xs sm:text-sm">Done</p></div>
                </div>
              ) : (
                <div className="text-center sm:text-right">
                  <p className="text-gray-400 text-base sm:text-lg">Not yet ranked</p>
                  <p className="text-gray-500 text-sm flex items-center gap-1 justify-end"><Clock className="w-4 h-4" /> Complete a challenge to appear</p>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="text-center mt-6 sm:mt-8 p-4">
          <p className="text-gray-400 text-xs sm:text-sm">Rankings update live as teams make progress</p>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ icon, title, value, color, className = "" }: { icon: React.ReactNode; title: string; value: number; color: string; className?: string }) {
  return (
    <div className={`bg-gray-800/50 backdrop-blur-md rounded-xl p-4 sm:p-6 border border-gray-700 text-center ${className}`}>
      {icon}
      <h3 className="text-sm sm:text-xl font-semibold text-white mb-1 sm:mb-2">{title}</h3>
      <p className={`text-xl sm:text-3xl font-bold ${color}`}>{value}</p>
    </div>
  );
}
