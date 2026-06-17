"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  MapPin, Users, Trophy, Clock, Play, Pause, LogOut, Target, Zap, Award, Activity,
  Bell, AlertTriangle, Smartphone, ChevronDown, ChevronUp, X,
} from "lucide-react";
import { useGameState, useTeam, useNotifications, useDismissNotification } from "@/hooks/useGame";
import { useEventStream } from "@/hooks/useEventStream";

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
const short = (d?: string) => (d ? deptShort[d] ?? d : "N/A");

const formatTime = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = String(Math.floor(s / 3600)).padStart(2, "0");
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const sec = String(s % 60).padStart(2, "0");
  return `${h}:${m}:${sec}`;
};

export default function DashboardPage() {
  useEventStream(true);
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role === "ADMIN") router.replace("/admin");
  }, [status, session, router]);

  const { data, isLoading } = useGameState();
  const { data: teamResp } = useTeam();
  const team = teamResp?.team;

  const [isVisible, setIsVisible] = useState(false);
  const [animatedScore, setAnimatedScore] = useState(0);
  const [showTeam, setShowTeam] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [timeUntilStart, setTimeUntilStart] = useState(0);
  const endRef = useRef(0);
  const startRef = useRef(0);

  useEffect(() => {
    const t = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  // Live countdowns seeded from server snapshot.
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

  // Animate score toward the real value.
  useEffect(() => {
    const target = data?.game.score ?? 0;
    let raf = 0;
    const start = Date.now();
    const from = animatedScore;
    const tick = () => {
      const p = Math.min((Date.now() - start) / 1500, 1);
      setAnimatedScore(Math.floor(from + (target - from) * p));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.game.score]);

  const { data: notifResp } = useNotifications();
  const notifications = notifResp?.notifications ?? [];
  const dismiss = useDismissNotification();

  if (isLoading || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-300 text-sm sm:text-base">Loading command center...</p>
        </div>
      </div>
    );
  }

  const { settings, game } = data;
  const active = settings.isActive;
  const completed = game.completedCount;
  const progressPercentage = (completed / game.total) * 100;
  const elapsed = settings.durationMs - timeRemaining;

  return (
    <div className="min-h-screen relative">
      {/* Nav */}
      <nav className="relative z-20 bg-gray-900/80 backdrop-blur-xl border-b border-gray-700/50 sticky top-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex justify-between items-center h-14 sm:h-16">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center">
                <Target className="w-3 h-3 sm:w-5 sm:h-5 text-white" />
              </div>
              <h1 className="text-lg sm:text-xl font-bold text-white">Command Center</h1>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                <Smartphone className="h-4 w-4 text-orange-400" />
                <span className="text-orange-300 text-xs font-medium">Single Device Login</span>
              </div>
              <button onClick={() => setShowNotifs(true)} className="relative flex items-center px-3 sm:px-4 py-2 text-gray-300 hover:text-white hover:bg-gray-800/50 rounded-lg transition-all group text-sm sm:text-base">
                <Bell className="h-4 w-4 mr-1 sm:mr-2 group-hover:scale-110 transition-transform" />
                <span className="hidden sm:inline">Notifications</span>
                {notifications.length > 0 && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                    <span className="text-xs text-white font-bold">{notifications.length > 9 ? "9+" : notifications.length}</span>
                  </div>
                )}
              </button>
              <button onClick={() => signOut({ redirectTo: "/login" })} className="flex items-center px-3 sm:px-4 py-2 text-gray-300 hover:text-white hover:bg-gray-800/50 rounded-lg transition-all group text-sm sm:text-base">
                <LogOut className="h-4 w-4 mr-1 sm:mr-2 group-hover:scale-110 transition-transform" />
                <span className="hidden xs:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className={`max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8 transition-all duration-1000 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
        {/* Welcome */}
        <div className="text-center mb-8 sm:mb-12">
          <h2 className="text-2xl sm:text-3xl lg:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 mb-2 sm:mb-4">
            Team: {team?.teamName || "Your Team"}
          </h2>
          <p className="text-sm sm:text-lg lg:text-xl text-gray-300">Your digital treasure hunting command center</p>
          <div className="flex items-center justify-center mt-4 sm:mt-6">
            <div className="flex items-center space-x-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-gray-800/50 backdrop-blur-sm rounded-full border border-gray-700/50">
              <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full animate-pulse ${active && !settings.isPaused ? "bg-green-400" : "bg-orange-400"}`} />
              <span className="text-white text-xs sm:text-sm font-medium">{active && !settings.isPaused ? "System Online" : "System Paused"}</span>
            </div>
          </div>
        </div>

        {/* Timer */}
        {active && (
          <div className="bg-gradient-to-br from-gray-800/40 to-gray-900/40 backdrop-blur-xl rounded-2xl p-4 sm:p-8 mb-6 sm:mb-8 border border-gray-700/50 shadow-2xl">
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6">
              <div className="relative">
                <Clock className="w-8 h-8 sm:w-12 sm:h-12 text-yellow-400 animate-pulse" />
                <div className="absolute inset-0 w-8 h-8 sm:w-12 sm:h-12 bg-yellow-400/20 rounded-full blur-xl animate-pulse" />
              </div>
              <div className="text-center">
                <p className="text-gray-400 text-xs sm:text-sm uppercase tracking-wide mb-1">
                  {timeUntilStart > 0 ? "Mission Starts In" : "Mission Time Remaining"}
                </p>
                <p className="text-2xl sm:text-3xl lg:text-4xl font-mono font-bold text-white tracking-wider">
                  {formatTime(timeUntilStart > 0 ? timeUntilStart : timeRemaining)}
                </p>
              </div>
              {settings.isPaused && (
                <div className="flex items-center space-x-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-orange-500/20 border border-orange-500/50 rounded-full">
                  <Pause className="w-4 h-4 sm:w-5 sm:h-5 text-orange-400" />
                  <span className="text-orange-400 font-medium text-xs sm:text-sm">Mission Paused</span>
                </div>
              )}
            </div>
            <div className="mt-4 sm:mt-6">
              <div className="w-full bg-gray-700/50 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full transition-all duration-1000 ${timeUntilStart > 0 ? "bg-gradient-to-r from-green-500 to-cyan-500" : "bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500"}`}
                  style={{ width: timeUntilStart > 0 ? "100%" : `${settings.durationMs ? Math.max(0, Math.min(100, (elapsed / settings.durationMs) * 100)) : 0}%` }}
                />
              </div>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-4 sm:gap-8 mb-6 sm:mb-8">
          {/* Progress */}
          <div className="bg-gradient-to-br from-gray-800/40 to-gray-900/40 backdrop-blur-xl rounded-2xl p-4 sm:p-8 border border-gray-700/50 shadow-2xl">
            <div className="flex items-center mb-4 sm:mb-6">
              <div className="w-8 h-8 sm:w-12 sm:h-12 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl flex items-center justify-center mr-3 sm:mr-4 shadow-lg">
                <Trophy className="w-4 h-4 sm:w-7 sm:h-7 text-white" />
              </div>
              <h3 className="text-lg sm:text-2xl font-bold text-white">Mission Progress</h3>
            </div>
            <div className="space-y-4 sm:space-y-6">
              <div className="text-center">
                <p className="text-gray-400 text-xs sm:text-sm uppercase tracking-wide mb-1 sm:mb-2">Current Score</p>
                <p className="text-3xl sm:text-4xl lg:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">{animatedScore}</p>
              </div>
              <div>
                <div className="flex justify-between items-center mb-2 sm:mb-3">
                  <p className="text-gray-400 text-xs sm:text-sm uppercase tracking-wide">Challenges Completed</p>
                  <p className="text-lg sm:text-xl font-bold text-white">{completed} / {game.total}</p>
                </div>
                <div className="w-full bg-gray-700/50 rounded-full h-3 sm:h-4 overflow-hidden mb-3 sm:mb-4">
                  <div className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 transition-all duration-1000" style={{ width: `${progressPercentage}%` }} />
                </div>
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div className="bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 rounded-xl p-3 sm:p-4 text-center">
                    <Target className="w-6 h-6 sm:w-8 sm:h-8 text-cyan-400 mx-auto mb-1 sm:mb-2" />
                    <p className="text-gray-400 text-xs uppercase tracking-wide">Pictures</p>
                    <p className="text-lg sm:text-2xl font-bold text-white">{game.picturesCompleted}/{game.pictureTotal}</p>
                  </div>
                  <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-xl p-3 sm:p-4 text-center">
                    <Zap className="w-6 h-6 sm:w-8 sm:h-8 text-purple-400 mx-auto mb-1 sm:mb-2" />
                    <p className="text-gray-400 text-xs uppercase tracking-wide">Riddles</p>
                    <p className="text-lg sm:text-2xl font-bold text-white">{game.riddlesCompleted}/{game.riddleTotal}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Team */}
          <div className="bg-gradient-to-br from-gray-800/40 to-gray-900/40 backdrop-blur-xl rounded-2xl p-4 sm:p-8 border border-gray-700/50 shadow-2xl">
            <div className="flex items-center mb-4 sm:mb-6">
              <div className="w-8 h-8 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center mr-3 sm:mr-4 shadow-lg">
                <Users className="w-4 h-4 sm:w-7 sm:h-7 text-white" />
              </div>
              <h3 className="text-lg sm:text-2xl font-bold text-white">Team {team?.teamName || ""}</h3>
            </div>
            <div className="space-y-3 sm:space-y-4">
              <div className="bg-gray-700/30 rounded-xl p-3 sm:p-4">
                <p className="text-gray-400 text-xs sm:text-sm uppercase tracking-wide">Team Leader</p>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mt-1">
                  <p className="text-white font-semibold text-sm sm:text-lg">{team?.leaderName || "N/A"}</p>
                  <div className="text-xs sm:text-sm">
                    <p className="text-cyan-400 font-mono">{team?.leaderMobile || "N/A"}</p>
                    <p className="text-gray-400">{short(team?.leaderDepartment)}</p>
                  </div>
                </div>
              </div>
              <div className="bg-gray-700/30 rounded-xl p-3 sm:p-4">
                <div className="flex items-center justify-between mb-2 sm:mb-3">
                  <p className="text-gray-400 text-xs sm:text-sm uppercase tracking-wide">Team Members ({team?.members?.length ?? 0})</p>
                  <button onClick={() => setShowTeam((v) => !v)} className="flex items-center text-cyan-400 hover:text-cyan-300 transition-colors p-1">
                    {showTeam ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
                {!showTeam ? (
                  <div className="text-center py-2">
                    <p className="text-white text-sm">{team?.members?.length ?? 0} members</p>
                    <p className="text-gray-400 text-xs">Click to view details</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2 animate-slideInDown">
                    {team?.members?.map((m, i) => (
                      <div key={i} className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-2 bg-gray-600/20 rounded-lg">
                        <span className="text-white font-medium text-sm sm:text-base">{m.name}</span>
                        <div className="text-xs sm:text-sm">
                          <span className="text-cyan-400 font-mono">{m.mobile}</span>
                          <span className="text-gray-400 ml-2 sm:block">{short(m.department)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="grid md:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <button
            onClick={() => router.push("/game")}
            disabled={!active || game.isComplete || timeUntilStart > 0}
            className={`group relative overflow-hidden px-4 sm:px-8 py-4 sm:py-6 bg-gradient-to-r ${!active || game.isComplete || timeUntilStart > 0 ? "from-gray-600 to-gray-700 cursor-not-allowed" : "from-cyan-600 to-blue-700 hover:from-cyan-700 hover:to-blue-800 hover:scale-[1.02] shadow-2xl shadow-cyan-500/25"} text-white rounded-2xl font-bold text-lg sm:text-xl transition-all duration-300 transform`}
          >
            <div className="relative z-10 flex items-center justify-center">
              <Play className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3 group-hover:scale-110 transition-transform" />
              <span className="text-sm sm:text-xl">{game.isComplete ? "Mission Complete!" : timeUntilStart > 0 ? "Mission Preparing..." : "Continue Mission"}</span>
            </div>
          </button>
          <button
            onClick={() => router.push("/leaderboard")}
            className="group relative overflow-hidden px-4 sm:px-8 py-4 sm:py-6 bg-gradient-to-r from-purple-600 to-pink-700 hover:from-purple-700 hover:to-pink-800 text-white rounded-2xl font-bold text-lg sm:text-xl transition-all duration-300 transform hover:scale-[1.02] shadow-2xl shadow-purple-500/25"
          >
            <div className="relative z-10 flex items-center justify-center">
              <Trophy className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3 group-hover:scale-110 transition-transform" />
              <span className="text-sm sm:text-xl">View Leaderboard</span>
            </div>
          </button>
        </div>

        {/* Status messages */}
        {!active && (
          <div className="bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/50 rounded-2xl p-4 sm:p-6 mb-4 sm:mb-6 backdrop-blur-sm">
            <div className="flex items-center">
              <Pause className="text-orange-400 mr-2 sm:mr-3 w-5 h-5 sm:w-6 sm:h-6" />
              <p className="text-orange-400 font-semibold text-sm sm:text-lg">Mission temporarily suspended by command</p>
            </div>
          </div>
        )}
        {game.isComplete && (
          <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/50 rounded-2xl p-4 sm:p-6 mb-4 sm:mb-6 backdrop-blur-sm">
            <div className="flex items-center">
              <Award className="text-green-400 mr-2 sm:mr-3 w-5 h-5 sm:w-6 sm:h-6 animate-pulse" />
              <p className="text-green-400 font-semibold text-sm sm:text-lg">Mission accomplished! All challenges completed!</p>
            </div>
          </div>
        )}

        <div className="bg-gradient-to-r from-orange-500/20 to-yellow-500/20 border border-orange-500/50 rounded-2xl p-4 sm:p-6 mb-4 sm:mb-6 backdrop-blur-sm">
          <div className="flex items-start">
            <AlertTriangle className="text-orange-400 mr-3 mt-0.5 flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6" />
            <div>
              <p className="text-orange-300 font-medium text-sm sm:text-base mb-1">Device Login Policy</p>
              <p className="text-orange-400 text-xs sm:text-sm">Only <strong>1 device is allowed to login at a time</strong>.</p>
            </div>
          </div>
        </div>

        {/* Stat grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {[
            { icon: MapPin, label: "Current Challenge", value: String(game.currentNumber), color: "from-blue-500 to-cyan-500" },
            { icon: Trophy, label: "Total Score", value: String(animatedScore), color: "from-yellow-500 to-orange-500" },
            { icon: Clock, label: "Time Active", value: formatTime(Math.max(0, elapsed)).slice(0, 5), color: "from-green-500 to-emerald-500" },
            { icon: Activity, label: "Progress", value: `${Math.round(progressPercentage)}%`, color: "from-purple-500 to-pink-500" },
          ].map((stat, index) => (
            <div key={index} className="bg-gradient-to-br from-gray-800/40 to-gray-900/40 backdrop-blur-xl rounded-2xl p-3 sm:p-6 border border-gray-700/50 text-center hover:scale-105 transition-all duration-300">
              <div className={`w-8 h-8 sm:w-12 sm:h-12 bg-gradient-to-r ${stat.color} rounded-xl flex items-center justify-center mx-auto mb-2 sm:mb-3 shadow-lg`}>
                <stat.icon className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
              </div>
              <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">{stat.label}</p>
              <p className="text-lg sm:text-2xl font-bold text-white">{stat.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Notification history modal */}
      {showNotifs && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 backdrop-blur-sm p-4 pt-16">
          <div className="w-full max-w-lg bg-gray-800/95 backdrop-blur-xl rounded-2xl border border-gray-700/50 p-6 max-h-[70vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white flex items-center"><Bell className="w-5 h-5 text-yellow-400 mr-2" /> Notifications</h3>
              <button onClick={() => setShowNotifs(false)} className="p-2 hover:bg-gray-700 rounded-lg"><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            {notifications.length === 0 ? (
              <p className="text-gray-400 text-center py-8">No new notifications</p>
            ) : (
              <div className="space-y-3">
                {notifications.map((n) => (
                  <div key={n.id} className="rounded-xl border border-gray-700/50 bg-gray-900/40 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-white font-semibold">{n.title ?? "Notification"}</p>
                        <p className="text-gray-300 text-sm mt-1">{n.message}</p>
                      </div>
                      <button onClick={() => dismiss.mutate(n.id)} className="rounded-md p-1 hover:bg-white/10"><X className="w-4 h-4 text-gray-400" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
