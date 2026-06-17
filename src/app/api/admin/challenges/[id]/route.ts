import { handle, json, assertSameOrigin, audit, ApiError } from "@/lib/api";
import { requireAdmin } from "@/lib/session";
import { rateLimit, POLICIES } from "@/lib/rateLimit";
import { parseOrThrow, challengeUpdateSchema } from "@/lib/validation";
import { updateChallenge, deleteChallenge } from "@/lib/datasets";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    assertSameOrigin(req);
    const admin = await requireAdmin();
    await rateLimit({ ...POLICIES.admin, id: admin.id });
    const { id } = await params;
    const body = await req.json().catch(() => {
      throw new ApiError(400, "Invalid JSON body", "BAD_JSON");
    });
    const input = parseOrThrow(challengeUpdateSchema, body);
    const result = await updateChallenge(id, input);
    audit("update_challenge", admin.id, { challengeId: id });
    return json(result);
  });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    assertSameOrigin(req);
    const admin = await requireAdmin();
    await rateLimit({ ...POLICIES.admin, id: admin.id });
    const { id } = await params;
    const result = await deleteChallenge(id);
    audit("delete_challenge", admin.id, { challengeId: id });
    return json(result);
  });
}
