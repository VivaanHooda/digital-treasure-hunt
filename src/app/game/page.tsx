"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  MapPin, Trophy, Target, Zap, Clock, SkipForward, Loader2, Pause, ArrowLeft, ArrowRight,
  CheckCircle, AlertCircle, Image as ImageIcon, ScrollText, Crosshair, Eye, Heart, Users,
} from "lucide-react";
import { useGameState, useVerify, useSkip, useTeam } from "@/hooks/useGame";
import { useEventStream } from "@/hooks/useEventStream";
import { ClientError } from "@/lib/client";
import SkipHeartsDisplay from "@/components/SkipHeartsDisplay";
import { GameOverPopup, CountdownToStart } from "@/components/GameOverPopup";

const confettiColors = ["#00ffff", "#bf00ff", "#ff0080", "#39ff14", "#ffff00"];
const formatTime = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = String(Math.floor(s / 3600)).padStart(2, "0");
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const sec = String(s % 60).padStart(2, "0");
  return `${h}:${m}:${sec}`;
};
const getPosition = (): Promise<GeolocationPosition> =>
  new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("Geolocation is not supported."));
    navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
  });

function SuccessPopup({ message, onNext, isVisible }: { message: string; onNext: () => void; isVisible: boolean }) {
  if (!isVisible) return null;
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn p-3 sm:p-6">
      <div className="absolute inset-0 pointer-events-none">
        {Array.from({ length: 30 }).map((_, i) => (
          <div key={i} className="absolute w-1.5 h-1.5 sm:w-2 sm:h-2 animate-particle" style={{ left: `${Math.random() * 100}%`, backgroundColor: confettiColors[Math.floor(Math.random() * 5)], animationDelay: `${Math.random() * 2}s`, animationDuration: `${3 + Math.random() * 2}s` }} />
        ))}
      </div>
      <div className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-xl rounded-xl sm:rounded-2xl p-6 sm:p-8 border border-green-500/50 text-center max-w-sm sm:max-w-md w-full mx-4 shadow-2xl shadow-green-500/25 animate-scaleIn">
        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-lg animate-pulse">
          <CheckCircle className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-500 mb-3 sm:mb-4">Correct!</h2>
        <p className="text-lg sm:text-xl text-gray-300 mb-6 sm:mb-8">{message}</p>
        <button onClick={onNext} className="group relative overflow-hidden px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 text-white rounded-lg sm:rounded-xl font-bold text-base sm:text-lg transition-all duration-300 transform hover:scale-105 shadow-lg w-full min-h-[48px]">
          <span className="relative z-10 flex items-center justify-center"><span className="mr-2 sm:mr-3">Next</span><ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" /></span>
        </button>
      </div>
    </div>
  );
}

function SkipConfirmationPopup({ title, onConfirm, onCancel, isVisible }: { title?: string; onConfirm: () => void; onCancel: () => void; isVisible: boolean }) {
  if (!isVisible) return null;
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-6">
      <div className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-xl rounded-xl sm:rounded-2xl p-6 sm:p-8 border border-orange-500/50 text-center max-w-sm sm:max-w-md w-full mx-4 shadow-2xl">
        <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
          <SkipForward className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-3 sm:mb-4">Skip This Challenge?</h2>
        <div className="bg-gray-700/30 rounded-lg sm:rounded-xl p-3 sm:p-4 mb-4 sm:mb-6">
          <p className="text-gray-300 mb-2 text-sm sm:text-base"><strong className="text-white">&quot;{title}&quot;</strong></p>
          <p className="text-orange-300 text-xs sm:text-sm">⚠️ You&apos;ll lose 5 points and one skip heart</p>
        </div>
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
          <button onClick={onCancel} className="flex-1 px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg sm:rounded-xl font-semibold transition-colors min-h-[48px]">Cancel</button>
          <button onClick={onConfirm} className="flex-1 px-4 py-3 bg-gradient-to-r from-orange-600 to-red-700 hover:from-orange-700 hover:to-red-800 text-white rounded-lg sm:rounded-xl font-semibold transition-all min-h-[48px]">Skip (-5 pts)</button>
        </div>
      </div>
    </div>
  );
}

export default function GamePage() {
  useEventStream(true);
  const router = useRouter();
  const { data, isLoading } = useGameState();
  const { data: teamResp } = useTeam();
  const team = teamResp?.team;
  const verify = useVerify();
  const skip = useSkip();

  const [isVisible, setIsVisible] = useState(false);
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
    const t = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(t);
  }, []);
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
      if (result.correct) setSuccessPopup({ show: true, message: `You were ${result.distance}m away.` });
      else setDisplayError(`You are ${result.distance}m away from the target location.`);
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
      setDisplayError(e instanceof ClientError ? e.message : "Could not skip.");
    }
  };

  if (isLoading || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-300 text-sm sm:text-base">Loading mission data...</p>
        </div>
      </div>
    );
  }

  const { settings, game, challenge } = data;
  const score = game.score;
  const progressPercentage = (game.completedCount / game.total) * 100;
  const gameTimeUp = settings.hasStarted && timeRemaining <= 0 && !game.isComplete && settings.isActive;

  // Game over (time up)
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

  // Not started
  if (!settings.hasStarted && untilStart > 0) {
    return <CountdownToStart startTimeMs={startRef.current} />;
  }

  // Paused / suspended
  if (!settings.isActive || settings.isPaused) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md mx-auto glass-dark rounded-xl sm:rounded-2xl p-6 sm:p-8 border border-gray-700/50 text-center backdrop-blur-xl">
          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-neon-purple">
            <Pause className="w-6 h-6 sm:w-8 sm:h-8 text-white animate-pulse" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3 sm:mb-4">Mission Suspended</h2>
          <p className="text-gray-300 mb-6 sm:mb-8 text-sm sm:text-base">The treasure hunt has been temporarily paused by mission control. Please standby.</p>
          <button onClick={() => router.push("/dashboard")} className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-700 hover:from-blue-700 hover:to-purple-800 text-white rounded-lg sm:rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg min-h-[48px]">
            Return to Command Center
          </button>
        </div>
      </div>
    );
  }

  // Complete
  if (game.isComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden p-4">
        <div className="max-w-lg mx-auto glass-dark rounded-xl sm:rounded-2xl p-6 sm:p-10 border border-green-500/50 text-center backdrop-blur-xl shadow-neon-cyan">
          <div className="w-16 h-16 sm:w-24 sm:h-24 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 sm:mb-8 shadow-neon-cyan animate-pulse">
            <Trophy className="w-8 h-8 sm:w-12 sm:h-12 text-white" />
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-500 mb-3 sm:mb-4">Mission Complete!</h2>
          <p className="text-lg sm:text-xl text-gray-300 mb-6 sm:mb-8">Outstanding work, agent! You&apos;ve completed all challenges.</p>
          <div className="bg-gray-800/50 rounded-xl sm:rounded-2xl p-4 sm:p-6 mb-6 sm:mb-8">
            <p className="text-4xl sm:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 mb-2">{score}</p>
            <p className="text-gray-400 text-sm sm:text-base">Final Mission Score</p>
          </div>
          <button onClick={() => router.push("/leaderboard")} className="w-full px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 text-white rounded-lg sm:rounded-xl font-semibold text-base sm:text-lg transition-all duration-300 transform hover:scale-105 shadow-lg min-h-[48px]">
            View Leaderboard
          </button>
        </div>
      </div>
    );
  }

  if (!challenge) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md mx-auto glass-dark rounded-xl sm:rounded-2xl p-6 sm:p-8 border border-red-500/50 text-center backdrop-blur-xl">
          <AlertCircle className="w-12 h-12 sm:w-16 sm:h-16 text-red-400 mx-auto mb-4 sm:mb-6 animate-pulse" />
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3 sm:mb-4">Challenge Data Missing</h2>
          <button onClick={() => router.push("/dashboard")} className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-700 text-white rounded-lg sm:rounded-xl min-h-[48px]">Return to Command Center</button>
        </div>
      </div>
    );
  }

  const isPicture = challenge.type === "PICTURE";

  return (
    <div className="min-h-screen relative">
      <SuccessPopup message={successPopup.message} isVisible={successPopup.show} onNext={() => setSuccessPopup({ show: false, message: "" })} />
      <SkipConfirmationPopup title={challenge.title} isVisible={showSkipConfirm} onConfirm={onSkip} onCancel={() => setShowSkipConfirm(false)} />

      {/* Nav */}
      <nav className="relative z-20 bg-gray-900/90 backdrop-blur-xl border-b border-gray-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex justify-between items-center h-14 sm:h-16">
            <button onClick={() => router.push("/dashboard")} className="flex items-center text-gray-300 hover:text-white hover:bg-gray-800/50 px-2 sm:px-3 py-2 rounded-lg transition-all group min-h-[44px]">
              <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2 group-hover:scale-110 transition-transform" />
              <span className="text-xs sm:text-sm">Command</span>
            </button>
            <div className="flex-1 flex justify-center">
              <SkipHeartsDisplay skipsRemaining={game.remainingSkips} maxSkips={game.maxSkips} />
            </div>
            <div className="text-right">
              <p className="text-gray-400 text-xs uppercase tracking-wide">Time</p>
              <p className="text-white font-mono font-bold text-sm sm:text-lg">{formatTime(timeRemaining)}</p>
            </div>
          </div>
        </div>
      </nav>

      <div className={`max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-8 transition-all duration-1000 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
        {/* Progress */}
        <div className="mb-6 sm:mb-8">
          <div className="flex justify-between items-center mb-3 sm:mb-4">
            <h2 className="text-xl sm:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">Mission Progress</h2>
            <div className="flex items-center space-x-2 sm:space-x-4 text-base sm:text-lg font-semibold text-white">
              <span className="text-sm sm:text-base">{game.completedCount}/{game.total}</span>
              <span className="text-gray-400 text-xs sm:text-base">Complete</span>
            </div>
          </div>
          <div className="w-full bg-gray-800/50 rounded-full h-3 sm:h-4 overflow-hidden backdrop-blur-sm border border-gray-700/50">
            <div className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 transition-all duration-1000 relative" style={{ width: `${progressPercentage}%` }}>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
            </div>
          </div>
          <div className="flex justify-between text-xs sm:text-sm text-gray-400 mt-2 sm:mt-3">
            <div className="flex items-center space-x-1 sm:space-x-2"><Target className="w-3 h-3 sm:w-4 sm:h-4 text-cyan-400" /><span>Pictures: {game.picturesCompleted}/{game.pictureTotal}</span></div>
            <div className="flex items-center space-x-1 sm:space-x-2"><Zap className="w-3 h-3 sm:w-4 sm:h-4 text-purple-400" /><span>Riddles: {game.riddlesCompleted}/{game.riddleTotal}</span></div>
          </div>
        </div>

        {/* Challenge */}
        <div className="glass-dark rounded-xl sm:rounded-2xl border border-gray-700/50 overflow-hidden shadow-2xl backdrop-blur-xl">
          <div className="bg-gradient-to-r from-gray-800/60 to-gray-900/60 p-4 sm:p-8 border-b border-gray-700/50">
            <div className="flex items-start sm:items-center justify-between flex-col sm:flex-row space-y-3 sm:space-y-0">
              <div className="flex items-center">
                <div className={`w-10 h-10 sm:w-14 sm:h-14 rounded-lg sm:rounded-xl flex items-center justify-center mr-3 sm:mr-4 shadow-lg ${isPicture ? "bg-gradient-to-br from-blue-500 to-cyan-600" : "bg-gradient-to-br from-purple-500 to-pink-600"}`}>
                  {isPicture ? <ImageIcon className="w-5 h-5 sm:w-8 sm:h-8 text-white" /> : <ScrollText className="w-5 h-5 sm:w-8 sm:h-8 text-white" />}
                </div>
                <div>
                  <div className="flex items-center space-x-2 sm:space-x-3 mb-1 sm:mb-2">
                    <h3 className="text-xl sm:text-3xl font-bold text-white leading-tight">{challenge.title}</h3>
                    <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${isPicture ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" : "bg-purple-500/20 text-purple-400 border border-purple-500/30"}`}>{challenge.type.toLowerCase()}</span>
                  </div>
                  <p className="text-gray-400 text-sm sm:text-lg">Challenge {challenge.number} • {challenge.points} points</p>
                </div>
              </div>
              <div className="text-center sm:text-right">
                <p className="text-3xl sm:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">{score}</p>
                <p className="text-gray-400 text-xs sm:text-sm uppercase tracking-wide">Mission Score</p>
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-8 space-y-4 sm:space-y-8">
            {isPicture && challenge.imageUrl && (
              <div className="text-center">
                <div className="relative inline-block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={challenge.imageUrl} alt={challenge.title} className="max-w-full h-48 sm:h-80 object-cover rounded-xl sm:rounded-2xl shadow-2xl border border-gray-600/50" />
                  <div className="absolute inset-0 rounded-xl sm:rounded-2xl bg-gradient-to-t from-black/20 via-transparent to-transparent" />
                  <div className="absolute top-2 right-2 sm:top-4 sm:right-4"><div className="bg-black/50 backdrop-blur-sm rounded-full p-1.5 sm:p-2"><Eye className="w-3 h-3 sm:w-5 sm:h-5 text-white" /></div></div>
                </div>
              </div>
            )}

            <div className="bg-gray-800/30 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-gray-600/30">
              <h4 className="text-white font-bold text-lg sm:text-xl mb-3 sm:mb-4 flex items-center"><Crosshair className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-cyan-400" />Mission Briefing</h4>
              <p className="text-gray-300 text-base sm:text-lg leading-relaxed">{challenge.description}</p>
            </div>

            <div className="bg-gray-800/30 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-gray-600/30">
              <div className="flex items-center mb-2 sm:mb-3"><MapPin className="w-5 h-5 sm:w-6 sm:h-6 text-green-400 mr-2" /><h4 className="text-white font-bold text-lg sm:text-xl">Target Location</h4></div>
              <div className="flex items-center"><Target className="w-4 h-4 text-green-400 mr-2" /><p className="text-gray-400 text-sm sm:text-base">Acceptable range: <span className="text-green-400 font-medium">{challenge.marginOfError}m</span></p></div>
            </div>
          </div>

          <div className="bg-gray-800/40 p-4 sm:p-8 border-t border-gray-700/50">
            {displayError && (
              <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-red-500/10 border border-red-500/50 rounded-lg sm:rounded-xl backdrop-blur-sm">
                <div className="flex items-start">
                  <AlertCircle className="text-red-400 mr-2 sm:mr-3 mt-1 flex-shrink-0 w-4 h-4 sm:w-5 sm:h-5" />
                  <div>
                    <p className="text-red-300 font-medium text-sm sm:text-base">{displayError.includes("away from the target") ? "Incorrect Location" : "Location Verification Failed"}</p>
                    <p className="text-red-400 text-xs sm:text-sm mt-1">{displayError}</p>
                  </div>
                </div>
              </div>
            )}

            {cooldown > 0 && (
              <div className="mb-4 sm:mb-6 p-4 sm:p-6 bg-orange-500/10 border border-orange-500/50 rounded-lg sm:rounded-xl backdrop-blur-sm">
                <div className="flex items-center justify-between flex-col sm:flex-row space-y-2 sm:space-y-0">
                  <div className="flex items-center"><Clock className="text-orange-400 mr-2 sm:mr-3 w-5 h-5 sm:w-6 sm:h-6" /><div><p className="text-orange-300 font-semibold text-base sm:text-lg">System Cooldown Active</p><p className="text-orange-400 text-xs sm:text-sm">Please wait before verifying again</p></div></div>
                  <p className="text-2xl sm:text-3xl font-mono font-bold text-orange-300">{cooldown}s</p>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:grid sm:grid-cols-4 gap-3 sm:gap-4">
              <button onClick={() => setShowSkipConfirm(true)} disabled={game.remainingSkips <= 0 || skip.isPending} className={`flex items-center justify-center px-4 sm:px-6 py-3 sm:py-4 rounded-lg sm:rounded-xl font-bold text-base sm:text-lg transition-all duration-300 transform group min-h-[48px] order-2 sm:order-1 ${game.remainingSkips <= 0 ? "bg-gray-600 cursor-not-allowed text-gray-400" : "bg-gradient-to-r from-orange-600 to-red-700 hover:from-orange-700 hover:to-red-800 text-white hover:scale-[1.02] shadow-lg shadow-orange-500/25"}`}>
                <SkipForward className="mr-2 group-hover:scale-110 transition-transform w-5 h-5" /><span className="text-sm sm:text-base">Skip (-5)</span>
              </button>
              <button onClick={onVerify} disabled={locating || verify.isPending || cooldown > 0} className={`sm:col-span-3 flex items-center justify-center px-6 sm:px-8 py-3 sm:py-4 rounded-lg sm:rounded-xl font-bold text-base sm:text-lg transition-all duration-300 transform group min-h-[48px] order-1 sm:order-2 ${locating || verify.isPending || cooldown > 0 ? "bg-gray-600 cursor-not-allowed text-white" : "bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 hover:scale-[1.02] shadow-lg shadow-green-500/25 text-white"}`}>
                {locating || verify.isPending ? (<><Loader2 className="mr-2 sm:mr-3 animate-spin w-5 h-5 sm:w-6 sm:h-6" /><span>Scanning Location...</span></>)
                  : cooldown > 0 ? (<><Clock className="mr-2 sm:mr-3 w-5 h-5 sm:w-6 sm:h-6" /><span>Cooldown ({cooldown}s)</span></>)
                  : (<><MapPin className="mr-2 sm:mr-3 group-hover:scale-110 transition-transform w-5 h-5 sm:w-6 sm:h-6" /><span>Verify Location</span></>)}
              </button>
            </div>
            <p className="text-center text-gray-400 text-xs sm:text-sm mt-3 sm:mt-4">Navigate to the target location and activate verification when ready, or use a skip if needed</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-6 sm:mt-8">
          {[
            { icon: Trophy, label: "Mission Score", value: String(score), color: "from-yellow-500 to-orange-600", textColor: "text-yellow-400" },
            { icon: Target, label: "Pictures Found", value: `${game.picturesCompleted}/${game.pictureTotal}`, color: "from-blue-500 to-cyan-600", textColor: "text-blue-400" },
            { icon: Zap, label: "Riddles Solved", value: `${game.riddlesCompleted}/${game.riddleTotal}`, color: "from-purple-500 to-pink-600", textColor: "text-purple-400" },
            { icon: Heart, label: "Skips Left", value: `${game.remainingSkips}/${game.maxSkips}`, color: "from-red-500 to-pink-600", textColor: "text-red-400" },
          ].map((stat, index) => (
            <div key={index} className="glass-dark rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-gray-700/50 text-center hover:scale-105 transition-all duration-300 group backdrop-blur-xl">
              <div className={`w-8 h-8 sm:w-12 sm:h-12 bg-gradient-to-r ${stat.color} rounded-lg sm:rounded-xl flex items-center justify-center mx-auto mb-2 sm:mb-3 shadow-lg group-hover:scale-110 transition-transform`}>
                <stat.icon className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
              </div>
              <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">{stat.label}</p>
              <p className={`text-lg sm:text-2xl font-bold ${stat.textColor}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="glass-dark rounded-xl sm:rounded-2xl p-4 sm:p-6 mt-6 sm:mt-8 border border-gray-700/50 backdrop-blur-xl">
          <div className="flex items-center justify-between flex-col sm:flex-row space-y-4 sm:space-y-0">
            <div className="flex items-center space-x-3 sm:space-x-4 text-center sm:text-left">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg sm:rounded-xl flex items-center justify-center"><Users className="w-5 h-5 sm:w-6 sm:h-6 text-white" /></div>
              <div>
                <p className="text-white font-semibold text-base sm:text-lg">Team: {team?.teamName ?? ""}</p>
                <p className="text-gray-400 text-xs sm:text-sm">{(team?.members?.length ?? 0) + 1} active agents in the field</p>
              </div>
            </div>
            <div className="flex items-center justify-center sm:justify-end space-x-4 sm:space-x-6 text-xs sm:text-sm">
              <div className="text-center"><p className="text-gray-400 uppercase tracking-wide">Current</p><p className="text-white font-bold">Challenge {game.currentNumber}</p></div>
              <div className="text-center"><p className="text-gray-400 uppercase tracking-wide">Remaining</p><p className="text-white font-bold">{game.total - game.completedCount - game.skippedCount}</p></div>
              <div className="text-center"><p className="text-gray-400 uppercase tracking-wide">Skips Used</p><p className="text-white font-bold">{game.skipsUsed}/{game.maxSkips}</p></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
