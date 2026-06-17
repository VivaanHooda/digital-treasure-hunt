import { handle, json, assertSameOrigin, ApiError } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { rateLimit, POLICIES } from "@/lib/rateLimit";
import { withUserLock } from "@/lib/lock";
import { parseOrThrow, verifySchema } from "@/lib/validation";
import { verifyLocation } from "@/lib/game";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return handle(async () => {
    assertSameOrigin(req);
    const user = await requireUser();
    await rateLimit({ ...POLICIES.verify, id: user.id });

    const body = await req.json().catch(() => {
      throw new ApiError(400, "Invalid JSON body", "BAD_JSON");
    });
    const input = parseOrThrow(verifySchema, body);

    const result = await withUserLock(user.id, () => verifyLocation(user.id, input));
    return json(result);
  });
}
