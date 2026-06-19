import { auth } from "@/auth";
import { redis, sessionKey } from "@/lib/redis";
import { ApiError } from "@/lib/api";
import type { Role } from "@prisma/client";

export type AuthedUser = { id: string; email: string; role: Role; sid?: string };

/**
 * Authoritative auth check for route handlers / server components (Node runtime).
 * Validates the session AND that this device's session id is still the active
 * one in Redis (enforces single-device login + instant revocation/logout).
 */
export async function requireUser(): Promise<AuthedUser> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new ApiError(401, "Unauthorized", "UNAUTHENTICATED");
  }

  // Admin (env-based) is allowed concurrent sessions; only regular users are
  // pinned to a single device via the Redis session id.
  if (session.user.role !== "ADMIN") {
    const activeSid = await redis.get(sessionKey(session.user.id));
    if (!activeSid || activeSid !== session.sid) {
      throw new ApiError(
        401,
        "Session no longer active (signed in on another device).",
        "SESSION_REVOKED",
      );
    }
  }

  return {
    id: session.user.id,
    email: session.user.email,
    role: session.user.role,
    sid: session.sid,
  };
}

export async function requireAdmin(): Promise<AuthedUser> {
  const user = await requireUser();
  if (user.role !== "ADMIN") {
    throw new ApiError(403, "Forbidden", "FORBIDDEN");
  }
  return user;
}
