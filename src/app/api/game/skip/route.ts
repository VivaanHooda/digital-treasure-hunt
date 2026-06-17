import { handle, json, assertSameOrigin } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { rateLimit, POLICIES } from "@/lib/rateLimit";
import { withUserLock } from "@/lib/lock";
import { skipChallenge } from "@/lib/game";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return handle(async () => {
    assertSameOrigin(req);
    const user = await requireUser();
    await rateLimit({ ...POLICIES.skip, id: user.id });
    const result = await withUserLock(user.id, () => skipChallenge(user.id));
    return json(result);
  });
}
