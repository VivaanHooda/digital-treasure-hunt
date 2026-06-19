import Redis from "ioredis";

// Node-runtime only. Never import this from edge middleware.
const url = process.env.REDIS_URL;
if (!url) {
  throw new Error("REDIS_URL is not set");
}

const globalForRedis = globalThis as unknown as { redis?: Redis };

export const redis =
  globalForRedis.redis ?? new Redis(url, { maxRetriesPerRequest: 3 });

if (process.env.NODE_ENV !== "production") globalForRedis.redis = redis;

/**
 * Create a dedicated connection. Pub/Sub subscribers must use their own
 * connection because a subscribed client cannot run normal commands.
 */
export function createRedis(): Redis {
  return new Redis(url!, { maxRetriesPerRequest: 3 });
}

// Redis key helpers.
export const sessionKey = (userId: string) => `session:${userId}`;

// Pub/Sub channels.
export const CHANNELS = {
  leaderboard: "rt:leaderboard",
  settings: "rt:settings",
  notifications: "rt:notifications",
  userGameState: (userId: string) => `rt:user:${userId}:gameState`,
  // Per-session channel — used to revoke a specific device in real time when
  // its account signs in elsewhere (single-device takeover).
  session: (sid: string) => `rt:session:${sid}`,
} as const;
