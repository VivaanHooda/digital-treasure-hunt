import { handle, json } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { rateLimit, POLICIES } from "@/lib/rateLimit";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// The caller's own team (their own PII only).
export async function GET() {
  return handle(async () => {
    const user = await requireUser();
    await rateLimit({ ...POLICIES.read, id: user.id });
    const team = await prisma.team.findUnique({
      where: { userId: user.id },
      select: {
        teamName: true,
        leaderName: true,
        leaderMobile: true,
        leaderDepartment: true,
        members: { select: { name: true, email: true, mobile: true, department: true } },
      },
    });
    return json({ team });
  });
}
