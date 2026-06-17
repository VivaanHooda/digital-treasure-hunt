import { handle, json, assertSameOrigin, audit, ApiError } from "@/lib/api";
import { requireAdmin } from "@/lib/session";
import { rateLimit, POLICIES } from "@/lib/rateLimit";
import { parseOrThrow, challengeCreateSchema } from "@/lib/validation";
import { listChallenges, createChallenge } from "@/lib/datasets";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const admin = await requireAdmin();
    await rateLimit({ ...POLICIES.admin, id: admin.id });
    const { id } = await params;
    return json({ challenges: await listChallenges(id) });
  });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    assertSameOrigin(req);
    const admin = await requireAdmin();
    await rateLimit({ ...POLICIES.admin, id: admin.id });
    const { id } = await params;
    const body = await req.json().catch(() => {
      throw new ApiError(400, "Invalid JSON body", "BAD_JSON");
    });
    const input = parseOrThrow(challengeCreateSchema, body);
    const result = await createChallenge(id, input);
    audit("create_challenge", admin.id, { datasetId: id, challengeId: result.id });
    return json(result, 201);
  });
}
