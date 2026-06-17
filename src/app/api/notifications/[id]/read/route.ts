import { handle, json, assertSameOrigin } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { rateLimit, POLICIES } from "@/lib/rateLimit";
import { markNotificationRead } from "@/lib/notifications";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    assertSameOrigin(req);
    const user = await requireUser();
    await rateLimit({ ...POLICIES.write, id: user.id });
    const { id } = await params;
    return json(await markNotificationRead(user.id, id));
  });
}
