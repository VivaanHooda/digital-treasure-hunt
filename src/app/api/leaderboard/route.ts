import { handle, json } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { rateLimit, POLICIES } from "@/lib/rateLimit";
import { getLeaderboard } from "@/lib/leaderboard";
import { cachedJson } from "@/lib/cache";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  return handle(async () => {
    const user = await requireUser();
    await rateLimit({ ...POLICIES.read, id: user.id });
    // The standings payload is identical for everyone — serve it from a short
    // Redis cache so a burst of SSE-triggered refetches costs one DB query.
    // Only the caller's own entry id is looked up per-request.
    const [entries, mine] = await Promise.all([
      cachedJson("leaderboard", 3_000, getLeaderboard),
      prisma.gameState.findUnique({ where: { userId: user.id }, select: { id: true } }),
    ]);
    return json({ entries, meId: mine?.id ?? null });
  });
}
