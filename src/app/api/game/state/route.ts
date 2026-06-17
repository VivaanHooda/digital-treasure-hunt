import { handle, json } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { rateLimit, POLICIES } from "@/lib/rateLimit";
import { getGameStateForUser } from "@/lib/game";

export const dynamic = "force-dynamic";

export async function GET() {
  return handle(async () => {
    const user = await requireUser();
    await rateLimit({ ...POLICIES.read, id: user.id });
    const state = await getGameStateForUser(user.id);
    return json(state);
  });
}
