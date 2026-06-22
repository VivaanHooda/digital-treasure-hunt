import { handle, audit } from "@/lib/api";
import { requireAdmin } from "@/lib/session";
import { rateLimit, POLICIES } from "@/lib/rateLimit";
import { buildArchiveAttendanceCsv } from "@/lib/archive";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const admin = await requireAdmin();
    await rateLimit({ ...POLICIES.admin, id: admin.id });
    const { id } = await params;
    const { csv, label } = await buildArchiveAttendanceCsv(id);
    audit("export_archive_attendance", admin.id, { id });

    const slug = label.replace(/[^a-z0-9-_]+/gi, "_").replace(/^_+|_+$/g, "").toLowerCase() || "game";
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${slug}.attendance.csv"`,
        "Cache-Control": "no-store",
      },
    });
  });
}
