import { handle, json, assertSameOrigin, audit, ApiError } from "@/lib/api";
import { requireAdmin } from "@/lib/session";
import { rateLimit, POLICIES } from "@/lib/rateLimit";
import { parseOrThrow, stopGameSchema } from "@/lib/validation";
import { stopGame } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return handle(async () => {
    assertSameOrigin(req);
    const admin = await requireAdmin();
    await rateLimit({ ...POLICIES.admin, id: admin.id });
    const body = await req.json().catch(() => {
      throw new ApiError(400, "Invalid JSON body", "BAD_JSON");
    });
    const { password } = parseOrThrow(stopGameSchema, body);
    const result = await stopGame(password);
    audit("stop_game", admin.id, {});
    return json(result);
  });
}
