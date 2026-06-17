import { handle, json, assertSameOrigin, audit, ApiError } from "@/lib/api";
import { requireAdmin } from "@/lib/session";
import { rateLimit, POLICIES } from "@/lib/rateLimit";
import { parseOrThrow, datasetSchema } from "@/lib/validation";
import { renameDataset, deleteDataset } from "@/lib/datasets";

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
    const { name } = parseOrThrow(datasetSchema, body);
    const result = await renameDataset(id, name);
    audit("rename_dataset", admin.id, { id, name });
    return json(result);
  });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    assertSameOrigin(req);
    const admin = await requireAdmin();
    await rateLimit({ ...POLICIES.admin, id: admin.id });
    const { id } = await params;
    const result = await deleteDataset(id);
    audit("delete_dataset", admin.id, { id });
    return json(result);
  });
}
