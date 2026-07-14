import { RateLimiterRedis } from "rate-limiter-flexible";
import { redis } from "./redis";
import { ApiError } from "./api";

// One limiter instance per named policy, cached across requests.
const limiters = new Map<string, RateLimiterRedis>();

function getLimiter(key: string, points: number, durationSec: number): RateLimiterRedis {
  const cacheKey = `${key}:${points}:${durationSec}`;
  let limiter = limiters.get(cacheKey);
  if (!limiter) {
    limiter = new RateLimiterRedis({
      storeClient: redis,
      keyPrefix: `rl:${key}`,
      points,
      duration: durationSec,
    });
    limiters.set(cacheKey, limiter);
  }
  return limiter;
}

/**
 * Consume one point for `id` under the named policy; throws 429 when exhausted.
 * `id` is typically a userId or client IP.
 */
export async function rateLimit(opts: {
  key: string;
  id: string;
  points: number;
  durationSec: number;
}): Promise<void> {
  const limiter = getLimiter(opts.key, opts.points, opts.durationSec);
  try {
    await limiter.consume(opts.id);
  } catch (res) {
    // RateLimiterRes when limited; a real error otherwise (fail open on infra error).
    if (res && typeof res === "object" && "msBeforeNext" in res) {
      const retrySec = Math.ceil((res as { msBeforeNext: number }).msBeforeNext / 1000);
      throw new ApiError(429, `Too many requests. Retry in ${retrySec}s.`, "RATE_LIMITED");
    }
    console.error("Rate limiter backend error (failing open):", res);
  }
}

// Standard policies used across the API.
//
// NOTE on keying: everyone at a campus event shares one or two NAT'd public
// IPs, so auth endpoints are limited PER EMAIL (brute-force protection that
// can't lock out the whole venue), with a generous per-IP ceiling as the
// second layer against distributed abuse.
export const POLICIES = {
  // Per-email: both the pre-login probe and the real sign-in consume from this.
  login: { key: "login", points: 10, durationSec: 60 },
  // Per-IP backstop for auth endpoints (must absorb a whole venue behind NAT).
  loginIp: { key: "loginIp", points: 300, durationSec: 60 },
  register: { key: "register", points: 30, durationSec: 300 },
  verify: { key: "verify", points: 10, durationSec: 60 },
  skip: { key: "skip", points: 10, durationSec: 60 },
  read: { key: "read", points: 240, durationSec: 60 },
  write: { key: "write", points: 30, durationSec: 60 },
  admin: { key: "admin", points: 60, durationSec: 60 },
} as const;
