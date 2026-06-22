import { handle, audit } from "@/lib/api";
import { requireAdmin } from "@/lib/session";
import { rateLimit, POLICIES } from "@/lib/rateLimit";
import { getArchive } from "@/lib/archive";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const admin = await requireAdmin();
    await rateLimit({ ...POLICIES.admin, id: admin.id });
    const { id } = await params;
    const data = await getArchive(id);
    audit("export_archive", admin.id, { id });

    const slug = data.label.replace(/[^a-z0-9-_]+/gi, "_").replace(/^_+|_+$/g, "").toLowerCase() || "game";
    return new Response(JSON.stringify(data, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${slug}.archive.json"`,
        "Cache-Control": "no-store",
      },
    });
  });
}
