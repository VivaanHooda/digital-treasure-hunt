import { handle, json, assertSameOrigin, audit, ApiError } from "@/lib/api";
import { requireAdmin } from "@/lib/session";
import { rateLimit, POLICIES } from "@/lib/rateLimit";
import { adjustEndTime } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return handle(async () => {
    assertSameOrigin(req);
    const admin = await requireAdmin();
    await rateLimit({ ...POLICIES.admin, id: admin.id });
    const body = await req.json().catch(() => {
      throw new ApiError(400, "Invalid JSON body", "BAD_JSON");
    });
    if (typeof body?.endTime !== "string") throw new ApiError(400, "endTime is required.", "BAD_TIME");
    const result = await adjustEndTime(body.endTime);
    audit("adjust_end_time", admin.id, { endTime: body.endTime });
    return json(result);
  });
}
