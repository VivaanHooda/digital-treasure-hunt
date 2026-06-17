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

export const events = {
  leaderboard: () => publish(CHANNELS.leaderboard, { type: "leaderboard" }),
  settings: () => publish(CHANNELS.settings, { type: "settings" }),
  notifications: () => publish(CHANNELS.notifications, { type: "notifications" }),
  userGameState: (userId: string) =>
    publish(CHANNELS.userGameState(userId), { type: "gameState" }),
};
