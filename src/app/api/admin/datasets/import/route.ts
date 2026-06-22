import { handle, json, assertSameOrigin, audit, ApiError } from "@/lib/api";
import { requireAdmin } from "@/lib/session";
import { rateLimit, POLICIES } from "@/lib/rateLimit";
import { parseOrThrow, datasetImportSchema } from "@/lib/validation";
import { importDataset } from "@/lib/datasets";

export const dynamic = "force-dynamic";

const MAX_IMPORT_BYTES = 50 * 1024 * 1024; // generous: base64 images inflate ~33%

export async function POST(req: Request) {
  return handle(async () => {
    assertSameOrigin(req);
    const admin = await requireAdmin();
    await rateLimit({ ...POLICIES.admin, id: admin.id });

    const form = await req.formData().catch(() => {
      throw new ApiError(400, "Expected a multipart form with a 'file'.", "BAD_FORM");
    });
    const file = form.get("file");
    if (!(file instanceof File)) throw new ApiError(400, "No file provided.", "NO_FILE");
    if (file.size > MAX_IMPORT_BYTES) throw new ApiError(413, "Import file too large (max 50 MB).", "FILE_TOO_LARGE");

    let parsed: unknown;
    try {
      parsed = JSON.parse(await file.text());
    } catch {
      throw new ApiError(400, "That file isn't valid JSON.", "BAD_JSON");
    }

    const payload = parseOrThrow(datasetImportSchema, parsed);
    const result = await importDataset(payload);
    audit("import_dataset", admin.id, { id: result.id, count: result.count });
    return json(result, 201);
  });
}
