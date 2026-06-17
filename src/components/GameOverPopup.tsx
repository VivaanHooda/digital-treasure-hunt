"use client";

import { useEffect, useState } from "react";
import { Trophy, Clock, Target, Award, Play, Heart, SkipForward } from "lucide-react";

const confettiColors = ["#00ffff", "#bf00ff", "#ff0080", "#39ff14", "#ffff00"];

export function GameOverPopup({
  score,
  completedCount,
  picturesCompleted,
  riddlesCompleted,
  skipsUsed,
  skipPenalty = 5,
  isComplete = false,
  onClose,
}: {
  score: number;
  completedCount: number;
  picturesCompleted: number;
  riddlesCompleted: number;
  skipsUsed: number;
  skipPenalty?: number;
  isComplete?: boolean;
  onClose: () => void;
}) {
  const [count, setCount] = useState(40);
  useEffect(() => setCount(window.innerWidth < 768 ? 30 : 50), []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm safe-area-inset px-3 sm:px-4 md:px-6">
      <div className="absolute inset-0 pointer-events-none">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="absolute w-1.5 h-1.5 sm:w-2 sm:h-2 animate-bounce rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              backgroundColor: confettiColors[Math.floor(Math.random() * confettiColors.length)],
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${2 + Math.random() * 3}s`,
            }}
          />
        ))}
      </div>

      <div className="relative bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 w-full max-w-sm sm:max-w-md md:max-w-lg border border-gray-700/50 shadow-2xl backdrop-blur-xl mx-3 sm:mx-4">
        <div className="text-center mb-4 sm:mb-6 md:mb-8">
          <div
            className={`w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br ${
              isComplete ? "from-green-500 to-emerald-600" : "from-red-500 to-orange-600"
            } rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6 shadow-lg animate-pulse`}
          >
            {isComplete ? (
              <Trophy className="w-8 h-8 md:w-10 md:h-10 text-white" />
            ) : (
              <Clock className="w-8 h-8 md:w-10 md:h-10 text-white" />
            )}
          </div>
          <h2
            className={`text-2xl sm:text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r ${
              isComplete ? "from-green-400 to-emerald-500" : "from-red-400 to-orange-500"
            } mb-2 md:mb-4`}
          >
            {isComplete ? "Mission Complete!" : "Time's Up!"}
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-gray-300">
            Your treasure hunting mission has ended
          </p>
        </div>

        <div className="space-y-4 md:space-y-6 mb-4 sm:mb-6 md:mb-8">
          <div className="bg-gray-700/30 rounded-xl sm:rounded-2xl p-4 md:p-6 text-center">
            <p className="text-3xl sm:text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 mb-1 sm:mb-2">
              {score}
            </p>
            <p className="text-gray-400 uppercase tracking-wide text-sm sm:text-base">Final Score</p>
          </div>

          <div className="grid grid-cols-4 gap-2 sm:gap-3">
            <StatBox icon={<Target className="w-4 h-4 sm:w-5 sm:h-5 text-white" />} grad="from-blue-500 to-cyan-600" value={completedCount} label="Total" />
            <StatBox icon={<Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-white" />} grad="from-green-500 to-emerald-600" value={picturesCompleted} label="Pictures" />
            <StatBox icon={<Award className="w-4 h-4 sm:w-5 sm:h-5 text-white" />} grad="from-purple-500 to-pink-600" value={riddlesCompleted} label="Riddles" />
            <StatBox icon={<SkipForward className="w-4 h-4 sm:w-5 sm:h-5 text-white" />} grad="from-orange-500 to-red-600" value={skipsUsed} label="Skips" />
          </div>

          {skipsUsed > 0 && (
            <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg sm:rounded-xl p-3 sm:p-4 text-center">
              <div className="flex items-center justify-center space-x-2 mb-1 sm:mb-2">
                <Heart className="w-4 h-4 sm:w-5 sm:h-5 text-red-400" />
                <span className="text-orange-300 font-semibold text-sm sm:text-base">Skip Penalty Applied</span>
              </div>
              <p className="text-gray-400 text-xs sm:text-sm">
                {skipsUsed} skip{skipsUsed > 1 ? "s" : ""} used • -{skipsUsed * skipPenalty} points deducted
              </p>
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          className="w-full px-6 md:px-8 py-3 md:py-4 bg-gradient-to-r from-blue-600 to-purple-700 hover:from-blue-700 hover:to-purple-800 text-white rounded-xl sm:rounded-2xl font-bold text-base sm:text-lg transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-lg ripple-effect"
        >
          View Leaderboard
        </button>
      </div>
    </div>
  );
}

function StatBox({ icon, grad, value, label }: { icon: React.ReactNode; grad: string; value: number; label: string }) {
  return (
    <div className="bg-gray-700/30 rounded-lg sm:rounded-xl p-2 sm:p-3 md:p-4 text-center">
      <div className={`w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br ${grad} rounded-lg flex items-center justify-center mx-auto mb-2 sm:mb-3`}>
        {icon}
      </div>
      <p className="text-lg sm:text-xl md:text-2xl font-bold text-white">{value}</p>
      <p className="text-gray-400 text-xs sm:text-sm">{label}</p>
    </div>
  );
}

export function CountdownToStart({ startTimeMs, onGameStart }: { startTimeMs: number; onGameStart?: () => void }) {
  const [remaining, setRemaining] = useState(Math.max(0, startTimeMs - Date.now()));
  useEffect(() => {
    const t = setInterval(() => {
      const r = Math.max(0, startTimeMs - Date.now());
      setRemaining(r);
      if (r <= 0) onGameStart?.();
    }, 1000);
    return () => clearInterval(t);
  }, [startTimeMs, onGameStart]);

  const fmt = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (d > 0) return `${d}d ${h}h ${m}m ${sec}s`;
    if (h > 0) return `${h}h ${m}m ${sec}s`;
    return `${m}m ${sec}s`;
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center safe-area-inset px-3 sm:px-4 md:px-6">
      <div className="w-full max-w-sm sm:max-w-md md:max-w-lg bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 sm:p-8 md:p-10 border border-gray-700/50 text-center backdrop-blur-xl shadow-2xl">
        <div className="w-20 h-20 md:w-24 md:h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6 md:mb-8 shadow-lg animate-pulse">
          <Play className="w-10 h-10 md:w-12 md:h-12 text-white" />
        </div>
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 mb-3 sm:mb-4">
          Get Ready!
        </h2>
        <p className="text-base sm:text-lg md:text-xl text-gray-300 mb-6 md:mb-8">
          The treasure hunt will begin in:
        </p>
        <div className="bg-gray-700/30 rounded-xl sm:rounded-2xl p-6 md:p-8 mb-6 md:mb-8">
          <p className="text-4xl sm:text-5xl md:text-6xl font-mono font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 break-all">
            {fmt(remaining)}
          </p>
        </div>
        <p className="text-gray-400 text-sm sm:text-base">
          Stay tuned! The mission will start automatically.
        </p>
      </div>
    </div>
  );
}
