import { handle, json, assertSameOrigin, audit, ApiError } from "@/lib/api";
import { requireAdmin } from "@/lib/session";
import { rateLimit, POLICIES } from "@/lib/rateLimit";
import { parseOrThrow, startGameSchema } from "@/lib/validation";
import { startGame } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return handle(async () => {
    assertSameOrigin(req);
    const admin = await requireAdmin();
    await rateLimit({ ...POLICIES.admin, id: admin.id });
    const body = await req.json().catch(() => {
      throw new ApiError(400, "Invalid JSON body", "BAD_JSON");
    });
    const input = parseOrThrow(startGameSchema, body);
    const result = await startGame(input);
    audit("start_game", admin.id, { datasetId: input.selectedDatasetId, startTime: input.startTime });
    return json(result);
  });
}
