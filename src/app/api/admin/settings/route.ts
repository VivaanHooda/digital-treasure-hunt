import { handle, json, assertSameOrigin, audit, ApiError } from "@/lib/api";
import { requireAdmin } from "@/lib/session";
import { rateLimit, POLICIES } from "@/lib/rateLimit";
import { parseOrThrow, settingsSchema } from "@/lib/validation";
import { getSettingsAdmin, updateSettings } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  return handle(async () => {
    const admin = await requireAdmin();
    await rateLimit({ ...POLICIES.admin, id: admin.id });
    return json(await getSettingsAdmin());
  });
}

export async function PATCH(req: Request) {
  return handle(async () => {
    assertSameOrigin(req);
    const admin = await requireAdmin();
    await rateLimit({ ...POLICIES.admin, id: admin.id });
    const body = await req.json().catch(() => {
      throw new ApiError(400, "Invalid JSON body", "BAD_JSON");
    });
    const input = parseOrThrow(settingsSchema, body);
    const result = await updateSettings(input);
    audit("update_settings", admin.id, input);
    return json(result);
  });
}
