"use client";

import { useEffect, useState } from "react";

export default function LoadingSpinner() {
  const [dots, setDots] = useState("");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const dotsInterval = setInterval(() => setDots((p) => (p.length >= 3 ? "" : p + ".")), 500);
    const progressInterval = setInterval(
      () => setProgress((p) => (p >= 90 ? 0 : p + Math.random() * 10)),
      200,
    );
    return () => {
      clearInterval(dotsInterval);
      clearInterval(progressInterval);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 sm:px-6">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-gray-900 to-black" />
      <div className="relative z-10 text-center max-w-sm mx-auto">
        <div className="relative mb-6 sm:mb-8 mx-auto">
          <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 border-2 sm:border-4 border-gray-700 rounded-full animate-spin mx-auto">
            <div className="absolute inset-0 border-2 sm:border-4 border-transparent border-t-cyan-400 rounded-full animate-spin" />
          </div>
          <div
            className="absolute inset-1 sm:inset-2 w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 border-2 sm:border-4 border-gray-600 rounded-full animate-spin"
            style={{ animationDirection: "reverse" }}
          >
            <div
              className="absolute inset-0 border-2 sm:border-4 border-transparent border-t-purple-400 rounded-full animate-spin"
              style={{ animationDirection: "reverse" }}
            />
          </div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 lg:w-2 lg:h-2 bg-blue-400 rounded-full animate-ping" />
        </div>
        <div className="mb-4 sm:mb-6 px-2">
          <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-white mb-1 sm:mb-2 leading-tight">
            Loading Treasure Hunt{dots}
          </h3>
          <p className="text-gray-400 text-xs sm:text-sm">Preparing your adventure</p>
        </div>
        <div className="w-full max-w-xs sm:max-w-sm mx-auto px-2">
          <div className="w-full bg-gray-700 rounded-full h-1.5 sm:h-2 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-300 ease-out relative"
              style={{ width: `${progress}%` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse" />
            </div>
          </div>
          <p className="text-gray-500 text-xs mt-1 sm:mt-2">{Math.round(progress)}%</p>
        </div>
      </div>
    </div>
  );
}
