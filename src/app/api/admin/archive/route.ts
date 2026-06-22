import { handle, json, assertSameOrigin, audit } from "@/lib/api";
import { requireAdmin } from "@/lib/session";
import { rateLimit, POLICIES } from "@/lib/rateLimit";
import { listArchives, archiveCurrentGame } from "@/lib/archive";

export const dynamic = "force-dynamic";

export async function GET() {
  return handle(async () => {
    const admin = await requireAdmin();
    await rateLimit({ ...POLICIES.admin, id: admin.id });
    return json({ archives: await listArchives() });
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    assertSameOrigin(req);
    const admin = await requireAdmin();
    await rateLimit({ ...POLICIES.admin, id: admin.id });
    const body = await req.json().catch(() => ({}));
    const label = typeof body?.label === "string" ? body.label : undefined;
    const result = await archiveCurrentGame(label);
    audit("archive_game", admin.id, result);
    return json(result, 201);
  });
}
