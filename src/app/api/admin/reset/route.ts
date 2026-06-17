import { handle, json, assertSameOrigin, audit } from "@/lib/api";
import { requireAdmin } from "@/lib/session";
import { rateLimit, POLICIES } from "@/lib/rateLimit";
import { resetAllTeams } from "@/lib/admin";

export const dynamic = "force-dynamic";

// Authorization is the gate (RBAC) — no client-side password (audit fix).
export async function POST(req: Request) {
  return handle(async () => {
    assertSameOrigin(req);
    const admin = await requireAdmin();
    await rateLimit({ ...POLICIES.admin, id: admin.id });
    const result = await resetAllTeams();
    audit("reset_all_teams", admin.id, { deleted: result.deleted });
    return json(result);
  });
}
