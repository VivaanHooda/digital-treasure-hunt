import { handle, json } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { rateLimit, POLICIES } from "@/lib/rateLimit";
import { getMomentum } from "@/lib/leaderboard";
import { cachedJson } from "@/lib/cache";

export const dynamic = "force-dynamic";

export async function GET() {
  return handle(async () => {
    const user = await requireUser();
    await rateLimit({ ...POLICIES.read, id: user.id });
    // Momentum walks every Completion/Skip row — cache it so concurrent
    // clients share one computation per window.
    return json(await cachedJson("momentum", 5_000, () => getMomentum()));
  });
}
