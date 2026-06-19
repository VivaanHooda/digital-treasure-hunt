"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { signOut } from "next-auth/react";

export const queryKeys = {
  gameState: ["gameState"] as const,
  leaderboard: ["leaderboard"] as const,
  notifications: ["notifications"] as const,
  adminSettings: ["adminSettings"] as const,
};

/**
 * Subscribes to the SSE stream and invalidates React Query caches when the
 * server signals a change. EventSource auto-reconnects; the server re-sends a
 * `snapshot` on each (re)connect so state is always reconciled after a drop.
 */
export function useEventStream(enabled = true) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    const es = new EventSource("/api/stream", { withCredentials: true });
    const invalidate = (key: readonly unknown[]) =>
      qc.invalidateQueries({ queryKey: key as unknown[] });

    const onSnapshot = () => {
      invalidate(queryKeys.gameState);
      invalidate(queryKeys.leaderboard);
      invalidate(queryKeys.notifications);
      invalidate(queryKeys.adminSettings);
    };

    es.addEventListener("snapshot", onSnapshot);
    es.addEventListener("gameState", () => invalidate(queryKeys.gameState));
    es.addEventListener("leaderboard", () => invalidate(queryKeys.leaderboard));
    es.addEventListener("notifications", () => invalidate(queryKeys.notifications));
    es.addEventListener("settings", () => {
      invalidate(queryKeys.gameState);
      invalidate(queryKeys.adminSettings);
    });

    // This account signed in on another device — drop this session immediately.
    let revoked = false;
    es.addEventListener("sessionRevoked", () => {
      if (revoked) return;
      revoked = true;
      es.close();
      void signOut({ redirect: false }).finally(() => {
        window.location.href = "/login?kicked=1";
      });
    });

    // On error EventSource reconnects automatically; the next snapshot reconciles.
    es.onerror = () => {};

    return () => es.close();
  }, [enabled, qc]);
}
