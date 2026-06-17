import { handle, json, assertSameOrigin, audit, ApiError } from "@/lib/api";
import { requireAdmin } from "@/lib/session";
import { rateLimit, POLICIES } from "@/lib/rateLimit";
import { parseOrThrow, notificationSchema } from "@/lib/validation";
import { listNotifications, sendNotification } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  return handle(async () => {
    const admin = await requireAdmin();
    await rateLimit({ ...POLICIES.admin, id: admin.id });
    return json({ notifications: await listNotifications() });
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    assertSameOrigin(req);
    const admin = await requireAdmin();
    await rateLimit({ ...POLICIES.admin, id: admin.id });
    const body = await req.json().catch(() => {
      throw new ApiError(400, "Invalid JSON body", "BAD_JSON");
    });
    const input = parseOrThrow(notificationSchema, body);
    const result = await sendNotification(admin.id, input);
    audit("send_notification", admin.id, { id: result.id, type: input.type });
    return json(result, 201);
  });
}
