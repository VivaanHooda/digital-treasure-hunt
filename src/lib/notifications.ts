import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api";

/** Active notifications this user has not yet dismissed. */
export async function getUserNotifications(userId: string) {
  const notes = await prisma.notification.findMany({
    where: { isActive: true, reads: { none: { userId } } },
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, message: true, type: true, createdAt: true },
  });
  return notes.map((n) => ({ ...n, createdAt: n.createdAt.toISOString() }));
}

/** Idempotent dismissal — no read-modify-write race (audit fix). */
export async function markNotificationRead(userId: string, notificationId: string) {
  try {
    await prisma.notificationRead.createMany({
      data: [{ userId, notificationId }],
      skipDuplicates: true,
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2003") {
      throw new ApiError(404, "Notification not found.", "NOT_FOUND");
    }
    throw e;
  }
  return { ok: true };
}
