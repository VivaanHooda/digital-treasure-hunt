import { handle, json } from "@/lib/api";
import { requireAdmin } from "@/lib/session";
import { rateLimit, POLICIES } from "@/lib/rateLimit";
import { getTeamsAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  return handle(async () => {
    const admin = await requireAdmin();
    await rateLimit({ ...POLICIES.admin, id: admin.id });
    return json({ teams: await getTeamsAdmin() });
  });
}
