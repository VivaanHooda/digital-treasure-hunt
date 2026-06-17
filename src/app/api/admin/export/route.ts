import { handle } from "@/lib/api";
import { requireAdmin } from "@/lib/session";
import { rateLimit, POLICIES } from "@/lib/rateLimit";
import { buildAttendanceCsv } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  return handle(async () => {
    const admin = await requireAdmin();
    await rateLimit({ ...POLICIES.admin, id: admin.id });
    const csv = await buildAttendanceCsv();
    const date = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="treasure_hunt_attendance_${date}.csv"`,
      },
    });
  });
}
