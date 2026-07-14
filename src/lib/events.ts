import { redis, CHANNELS } from "./redis";

/**
 * Publish a lightweight "something changed" signal to a Redis channel.
 * Subscribers (the SSE stream) react by telling clients to refetch, so the
 * payload never needs to carry authoritative state (avoids desync bugs).
 */
async function publish(channel: string, payload: Record<string, unknown>) {
  try {
    await redis.publish(channel, JSON.stringify({ ...payload, at: Date.now() }));
  } catch (e) {
    console.error(`Failed to publish to ${channel}:`, e);
  }
}

// Score changes arrive in bursts (every verify/skip fires one). Each event makes
// EVERY connected client refetch the leaderboard, so an unthrottled publish is a
// fan-out amplifier: N clients × M events/min. Coalesce to at most one signal per
// window; clients also poll on an interval, so a dropped trailing event still
// reconciles within seconds.
const LEADERBOARD_DEBOUNCE_MS = 3_000;

async function publishLeaderboardDebounced() {
  try {
    const acquired = await redis.set(
      "rt:debounce:leaderboard",
      "1",
      "PX",
      LEADERBOARD_DEBOUNCE_MS,
      "NX",
    );
    if (!acquired) return;
  } catch (e) {
    // Debounce guard failing must never suppress the signal itself.
    console.error("Leaderboard debounce check failed (publishing anyway):", e);
  }
  await publish(CHANNELS.leaderboard, { type: "leaderboard" });
}

export const events = {
  leaderboard: () => publishLeaderboardDebounced(),
  settings: () => publish(CHANNELS.settings, { type: "settings" }),
  notifications: () => publish(CHANNELS.notifications, { type: "notifications" }),
  userGameState: (userId: string) =>
    publish(CHANNELS.userGameState(userId), { type: "gameState" }),
};
