import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";

export const dynamic = "force-dynamic";

/**
 * Liveness/readiness probe for uptime monitoring during an event.
 * Public and unauthenticated; reveals only up/down per dependency.
 */
export async function GET() {
  const [db, cache] = await Promise.all([
    prisma.$queryRaw`SELECT 1`.then(() => true).catch(() => false),
    redis.ping().then(() => true).catch(() => false),
  ]);
  const ok = db && cache;
  return Response.json(
    { ok, db, redis: cache },
    { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
