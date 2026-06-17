import { handle, json } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { rateLimit, POLICIES } from "@/lib/rateLimit";
import { getLeaderboard } from "@/lib/leaderboard";

export const dynamic = "force-dynamic";

export async function GET() {
  return handle(async () => {
    const user = await requireUser();
    await rateLimit({ ...POLICIES.read, id: user.id });
    return json({ entries: await getLeaderboard() });
  });
}
