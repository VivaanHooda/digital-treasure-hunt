import { handle, json, assertSameOrigin, audit, ApiError } from "@/lib/api";
import { requireAdmin } from "@/lib/session";
import { rateLimit, POLICIES } from "@/lib/rateLimit";
import { parseOrThrow, gameRulesSchema } from "@/lib/validation";
import { updateGameRules } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request) {
  return handle(async () => {
    assertSameOrigin(req);
    const admin = await requireAdmin();
    await rateLimit({ ...POLICIES.admin, id: admin.id });
    const body = await req.json().catch(() => {
      throw new ApiError(400, "Invalid JSON body", "BAD_JSON");
    });
    const input = parseOrThrow(gameRulesSchema, body);
    const result = await updateGameRules(input);
    audit("update_rules", admin.id, input);
    return json(result);
  });
}
