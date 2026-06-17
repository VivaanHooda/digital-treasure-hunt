import { handle, json, assertSameOrigin, audit, ApiError } from "@/lib/api";
import { requireAdmin } from "@/lib/session";
import { rateLimit, POLICIES } from "@/lib/rateLimit";
import { parseOrThrow, datasetSchema } from "@/lib/validation";
import { listDatasets, createDataset } from "@/lib/datasets";

export const dynamic = "force-dynamic";

export async function GET() {
  return handle(async () => {
    const admin = await requireAdmin();
    await rateLimit({ ...POLICIES.admin, id: admin.id });
    return json({ datasets: await listDatasets() });
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
    const { name } = parseOrThrow(datasetSchema, body);
    const result = await createDataset(name);
    audit("create_dataset", admin.id, { id: result.id, name });
    return json(result, 201);
  });
}
