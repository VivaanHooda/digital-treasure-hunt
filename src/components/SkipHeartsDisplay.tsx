"use client";

import { Heart } from "lucide-react";

export default function SkipHeartsDisplay({
  skipsRemaining,
  maxSkips = 3,
  className = "",
}: {
  skipsRemaining: number;
  maxSkips?: number;
  className?: string;
}) {
  const hearts = Array.from({ length: maxSkips }, (_, index) => {
    const isActive = index < skipsRemaining;
    return (
      <div
        key={index}
        className={`relative transition-all duration-300 transform ${
          isActive ? "scale-100 opacity-100" : "scale-75 opacity-30"
        }`}
      >
        <Heart
          className={`w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 transition-all duration-300 ${
            isActive
              ? "text-red-500 fill-red-500 drop-shadow-lg animate-pulse"
              : "text-gray-500 fill-gray-700"
          }`}
        />
        {isActive && (
          <div className="absolute inset-0 w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 bg-red-500/30 rounded-full blur-lg animate-pulse" />
        )}
      </div>
    );
  });

  return (
    <div className={`flex flex-col sm:flex-row items-center sm:space-x-2 space-y-1 sm:space-y-0 ${className}`}>
      <div className="flex items-center space-x-1 sm:space-x-1.5">{hearts}</div>
      <div className="text-xs sm:text-sm text-gray-400 sm:ml-2">
        <span className="font-semibold text-white text-sm sm:text-base">{skipsRemaining}</span>
        <span className="text-gray-500"> skip{skipsRemaining !== 1 ? "s" : ""} left</span>
      </div>
    </div>
  );
}
