import { redis } from "./redis";

/**
 * Read-through Redis cache for hot payloads that are identical for every user
 * (leaderboard, momentum). A few seconds of staleness is invisible in the UI,
 * but it turns N-clients-refetching-at-once into a single DB query per window.
 * Fails open: any Redis error falls back to computing directly.
 */
export async function cachedJson<T>(
  key: string,
  ttlMs: number,
  compute: () => Promise<T>,
): Promise<T> {
  const cacheKey = `cache:${key}`;
  try {
    const hit = await redis.get(cacheKey);
    if (hit) return JSON.parse(hit) as T;
  } catch (e) {
    console.error(`Cache read failed for ${key}:`, e);
  }
  const value = await compute();
  try {
    await redis.set(cacheKey, JSON.stringify(value), "PX", ttlMs);
  } catch (e) {
    console.error(`Cache write failed for ${key}:`, e);
  }
  return value;
}
