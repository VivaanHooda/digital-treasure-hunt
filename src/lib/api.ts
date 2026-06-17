import { NextResponse } from "next/server";

// Thrown anywhere in a request and translated to an HTTP response by `handle`.
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function fail(status: number, message: string, code?: string) {
  return NextResponse.json({ error: message, code }, { status });
}

/** Best-effort client IP for rate limiting. */
export function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

/**
 * CSRF defense-in-depth: reject mutating requests whose Origin doesn't match
 * the host. (Session cookies are SameSite=Lax, so this is a second layer.)
 * A missing Origin is allowed — same-origin GET-style navigations and tooling
 * omit it, and the SameSite cookie still protects.
 */
export function assertSameOrigin(req: Request): void {
  const origin = req.headers.get("origin");
  if (!origin) return;
  const host = req.headers.get("host");
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    throw new ApiError(403, "Invalid origin", "BAD_ORIGIN");
  }
  if (originHost !== host) {
    throw new ApiError(403, "Cross-origin request blocked", "BAD_ORIGIN");
  }
}

/** Structured audit log line for sensitive (admin) actions. */
export function audit(action: string, actorId: string, meta?: Record<string, unknown>) {
  console.info(
    `[audit] ${new Date().toISOString()} action=${action} actor=${actorId}` +
      (meta ? ` meta=${JSON.stringify(meta)}` : ""),
  );
}

/** Wraps a route handler, turning thrown ApiErrors into clean responses. */
export async function handle(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof ApiError) return fail(e.status, e.message, e.code);
    console.error("Unhandled API error:", e);
    return fail(500, "Internal server error");
  }
}
