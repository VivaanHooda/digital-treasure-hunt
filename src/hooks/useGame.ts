"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiSend } from "@/lib/client";
import { queryKeys } from "./useEventStream";

export type GameStateResponse = {
  serverNow: number;
  settings: {
    startTime: string;
    durationMs: number;
    isPaused: boolean;
    isActive: boolean;
    hasStarted: boolean;
    timeRemaining: number;
    timeUntilStart: number;
  };
  game: {
    score: number;
    currentNumber: number;
    total: number;
    completedCount: number;
    skippedCount: number;
    skipsUsed: number;
    remainingSkips: number;
    maxSkips: number;
    skipPenalty: number;
    picturesCompleted: number;
    riddlesCompleted: number;
    pictureTotal: number;
    riddleTotal: number;
    isComplete: boolean;
    cooldownRemaining: number;
  };
  challenge: {
    number: number;
    total: number;
    type: "PICTURE" | "RIDDLE";
    title: string;
    description: string;
    imageUrl: string | null;
    points: number;
    marginOfError: number;
  } | null;
};

export type VerifyResult = {
  correct: boolean;
  distance: number;
  marginOfError: number;
  points?: number;
  isComplete: boolean;
  cooldownRemaining: number;
};

export type LeaderboardEntry = {
  /** Stable opaque id — team names are NOT unique; key rows on this. */
  id: string;
  rank: number;
  teamName: string;
  score: number;
  completedCount: number;
  total: number;
  isComplete: boolean;
  lastCompletedAt: string | null;
};

export type UserNotification = {
  id: string;
  title: string | null;
  message: string;
  type: "info" | "warning" | "success" | "error";
  createdAt: string;
};

export type TeamData = {
  teamName: string;
  leaderName: string;
  leaderMobile: string;
  leaderDepartment: string;
  members: { name: string; email: string | null; mobile: string; department: string }[];
} | null;

export function useTeam() {
  return useQuery({
    queryKey: ["team"],
    queryFn: () => apiGet<{ team: TeamData }>("/api/team"),
  });
}

export function useGameState() {
  return useQuery({
    queryKey: queryKeys.gameState,
    queryFn: () => apiGet<GameStateResponse>("/api/game/state"),
    refetchInterval: 30_000, // safety net atop SSE
  });
}

export function useLeaderboard() {
  return useQuery({
    queryKey: queryKeys.leaderboard,
    // meId identifies the caller's own entry (self-highlight by id, not name).
    queryFn: () => apiGet<{ entries: LeaderboardEntry[]; meId: string | null }>("/api/leaderboard"),
    refetchInterval: 15_000, // safety net atop SSE; also keeps the sync clock live
  });
}

export type TeamMomentum = {
  /** GameState id — matches LeaderboardEntry.id. */
  id: string;
  teamName: string;
  spark: number[];
  recentGain: number;
};

export type MomentumResponse = {
  teams: TeamMomentum[];
  from: number;
  to: number;
  windowMs: number;
};

export function useMomentum() {
  return useQuery({
    // Shares the "leaderboard" key family so the existing SSE event invalidates it.
    queryKey: [...queryKeys.leaderboard, "momentum"],
    queryFn: () => apiGet<MomentumResponse>("/api/leaderboard/momentum"),
    refetchInterval: 15_000,
  });
}

export function useNotifications() {
  return useQuery({
    queryKey: queryKeys.notifications,
    queryFn: () => apiGet<{ notifications: UserNotification[] }>("/api/notifications"),
  });
}

export function useVerify() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { latitude: number; longitude: number; accuracy?: number }) =>
      apiSend<VerifyResult>("/api/game/verify", "POST", body),
    onSettled: () => qc.invalidateQueries({ queryKey: queryKeys.gameState }),
  });
}

export function useSkip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiSend<{ skipped: boolean }>("/api/game/skip", "POST"),
    onSettled: () => qc.invalidateQueries({ queryKey: queryKeys.gameState }),
  });
}

export function useDismissNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiSend(`/api/notifications/${id}/read`, "POST"),
    onSettled: () => qc.invalidateQueries({ queryKey: queryKeys.notifications }),
  });
}
