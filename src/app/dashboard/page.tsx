"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { MapPin, Trophy, Target, Zap, SkipForward, Clock } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useGameState } from "@/hooks/useGame";

export default function DashboardPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  // Admins have no game; send them to the control panel.
  useEffect(() => {
    if (status === "authenticated" && session?.user?.role === "ADMIN") {
      router.replace("/admin");
    }
  }, [status, session, router]);

  const { data } = useGameState();
  const g = data?.game;

  return (
    <AppShell>
      <h1 className="mb-6 text-2xl font-bold text-white">Your Mission Control</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat icon={<Trophy className="text-yellow-400" />} label="Score" value={g?.score ?? "—"} />
        <Stat icon={<Target className="text-cyan-400" />} label="Completed" value={g ? `${g.completedCount}/${g.total}` : "—"} />
        <Stat icon={<Zap className="text-purple-400" />} label="Pictures / Riddles" value={g ? `${g.picturesCompleted} / ${g.riddlesCompleted}` : "—"} />
        <Stat icon={<SkipForward className="text-orange-400" />} label="Skips Left" value={g ? `${g.remainingSkips}/${g.maxSkips}` : "—"} />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link
          href="/game"
          className="flex items-center justify-between rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-6 transition hover:bg-cyan-500/20"
        >
          <div>
            <h2 className="text-lg font-bold text-white">Continue the Hunt</h2>
            <p className="text-sm text-gray-300">
              {g?.isComplete ? "Game complete!" : `Challenge ${g?.currentNumber ?? "—"} of ${g?.total ?? 40}`}
            </p>
          </div>
          <MapPin className="h-8 w-8 text-cyan-400" />
        </Link>

        <Link
          href="/leaderboard"
          className="flex items-center justify-between rounded-2xl border border-purple-500/30 bg-purple-500/10 p-6 transition hover:bg-purple-500/20"
        >
          <div>
            <h2 className="text-lg font-bold text-white">Leaderboard</h2>
            <p className="text-sm text-gray-300">See where your team ranks</p>
          </div>
          <Trophy className="h-8 w-8 text-purple-400" />
        </Link>
      </div>

      {data?.settings && !data.settings.hasStarted && (
        <div className="mt-6 flex items-center gap-2 rounded-xl border border-orange-500/40 bg-orange-500/10 p-4 text-orange-200">
          <Clock className="h-5 w-5" />
          The game has not started yet. Get ready!
        </div>
      )}
    </AppShell>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-700/50 bg-gray-800/30 p-4 backdrop-blur-xl">
      <div className="mb-2 h-5 w-5">{icon}</div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-xl font-bold text-white">{value}</p>
    </div>
  );
}
