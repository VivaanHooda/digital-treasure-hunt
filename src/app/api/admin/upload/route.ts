import { handle, json, assertSameOrigin, audit, ApiError } from "@/lib/api";
import { requireAdmin } from "@/lib/session";
import { rateLimit, POLICIES } from "@/lib/rateLimit";
import { saveUpload } from "@/lib/uploads";
import { isDatasetLocked } from "@/lib/datasets";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return handle(async () => {
    assertSameOrigin(req);
    const admin = await requireAdmin();
    await rateLimit({ ...POLICIES.admin, id: admin.id });

    const form = await req.formData().catch(() => {
      throw new ApiError(400, "Expected multipart form data", "BAD_FORM");
    });
    const file = form.get("file");
    if (!(file instanceof File)) throw new ApiError(400, "No file provided", "NO_FILE");

    // If uploading for an existing dataset, respect its lock.
    const datasetId = form.get("datasetId");
    if (typeof datasetId === "string" && datasetId && (await isDatasetLocked(datasetId))) {
      throw new ApiError(409, "This dataset is locked while a game using it is in progress.", "DATASET_LOCKED");
    }

    const url = await saveUpload(file);
    audit("upload_image", admin.id, { url });
    return json({ url }, 201);
  });
}
