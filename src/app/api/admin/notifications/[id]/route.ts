import { handle, json, assertSameOrigin, audit } from "@/lib/api";
import { requireAdmin } from "@/lib/session";
import { rateLimit, POLICIES } from "@/lib/rateLimit";
import { deactivateNotification, deleteNotification } from "@/lib/admin";

export const dynamic = "force-dynamic";

// Deactivate (soft-disable) a notification.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    assertSameOrigin(req);
    const admin = await requireAdmin();
    await rateLimit({ ...POLICIES.admin, id: admin.id });
    const { id } = await params;
    const result = await deactivateNotification(id);
    audit("deactivate_notification", admin.id, { id });
    return json(result);
  });
}

// Permanently delete a notification.
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    assertSameOrigin(req);
    const admin = await requireAdmin();
    await rateLimit({ ...POLICIES.admin, id: admin.id });
    const { id } = await params;
    const result = await deleteNotification(id);
    audit("delete_notification", admin.id, { id });
    return json(result);
  });
}
