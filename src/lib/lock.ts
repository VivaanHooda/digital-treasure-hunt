import { redis } from "./redis";
import { ApiError } from "./api";

/**
 * Serialize mutating game actions per user with a short-lived Redis lock so two
 * concurrent verify/skip requests can never race (defense in depth alongside the
 * DB unique constraints). Throws 429 if a lock is already held.
 */
export async function withUserLock<T>(
  userId: string,
  fn: () => Promise<T>,
  ttlMs = 10_000,
): Promise<T> {
  const key = `lock:game:${userId}`;
  const token = globalThis.crypto.randomUUID();
  const acquired = await redis.set(key, token, "PX", ttlMs, "NX");
  if (!acquired) {
    throw new ApiError(429, "Another action is already in progress.", "LOCKED");
  }
  try {
    return await fn();
  } finally {
    // Release only if we still own the lock.
    const current = await redis.get(key);
    if (current === token) await redis.del(key);
  }
}
