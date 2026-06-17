import { prisma } from "@/lib/prisma";
import { events } from "@/lib/events";
import { ApiError } from "@/lib/api";
import type { Dataset } from "@prisma/client";

// ---- Settings -------------------------------------------------------------

export async function getSettingsAdmin() {
  const s = await prisma.gameSettings.findUnique({ where: { id: "global" } });
  if (!s) throw new ApiError(500, "Game settings missing", "NO_SETTINGS");
  return {
    startTime: s.startTime.toISOString(),
    durationMs: s.durationMs,
    isPaused: s.isPaused,
    pausedAt: s.pausedAt?.toISOString() ?? null,
    totalPauseMs: s.totalPauseMs,
    isActive: s.isActive,
    selectedDataset: s.selectedDataset,
    updatedAt: s.updatedAt.toISOString(),
  };
}

export async function updateSettings(input: {
  startTime?: string;
  durationMs?: number;
  selectedDataset?: "A" | "B";
  isActive?: boolean;
}) {
  const data: Record<string, unknown> = {};
  if (input.startTime !== undefined) data.startTime = new Date(input.startTime);
  if (input.durationMs !== undefined) data.durationMs = input.durationMs;
  if (input.selectedDataset !== undefined) data.selectedDataset = input.selectedDataset as Dataset;
  if (input.isActive !== undefined) data.isActive = input.isActive;

  await prisma.gameSettings.update({ where: { id: "global" }, data });
  await events.settings();
  return getSettingsAdmin();
}

/** Pause/resume. Resuming accumulates the elapsed pause into totalPauseMs. */
export async function setPaused(paused: boolean) {
  const s = await prisma.gameSettings.findUnique({ where: { id: "global" } });
  if (!s) throw new ApiError(500, "Game settings missing", "NO_SETTINGS");

  if (paused) {
    if (s.isPaused) return getSettingsAdmin();
    await prisma.gameSettings.update({
      where: { id: "global" },
      data: { isPaused: true, pausedAt: new Date() },
    });
  } else {
    if (!s.isPaused) return getSettingsAdmin();
    const elapsed = s.pausedAt ? Date.now() - s.pausedAt.getTime() : 0;
    await prisma.gameSettings.update({
      where: { id: "global" },
      data: { isPaused: false, pausedAt: null, totalPauseMs: s.totalPauseMs + Math.max(0, elapsed) },
    });
  }
  await events.settings();
  return getSettingsAdmin();
}

// ---- Notifications --------------------------------------------------------

export async function sendNotification(
  adminId: string,
  input: { title?: string; message: string; type: "info" | "warning" | "success" | "error" },
) {
  const note = await prisma.notification.create({
    data: {
      title: input.title?.trim() || "Admin Notification",
      message: input.message,
      type: input.type,
      createdById: adminId,
    },
  });
  await events.notifications();
  return { id: note.id };
}

export async function listNotifications() {
  const notes = await prisma.notification.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      message: true,
      type: true,
      isActive: true,
      createdAt: true,
      _count: { select: { reads: true } },
    },
  });
  return notes.map((n) => ({
    id: n.id,
    title: n.title,
    message: n.message,
    type: n.type,
    isActive: n.isActive,
    createdAt: n.createdAt.toISOString(),
    readCount: n._count.reads,
  }));
}

export async function deactivateNotification(id: string) {
  await prisma.notification.update({ where: { id }, data: { isActive: false } }).catch(() => {
    throw new ApiError(404, "Notification not found", "NOT_FOUND");
  });
  await events.notifications();
  return { ok: true };
}

export async function deleteNotification(id: string) {
  await prisma.notification.delete({ where: { id } }).catch(() => {
    throw new ApiError(404, "Notification not found", "NOT_FOUND");
  });
  await events.notifications();
  return { ok: true };
}

// ---- Teams / export / reset ----------------------------------------------

export async function getTeamsAdmin() {
  const teams = await prisma.team.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      teamName: true,
      leaderName: true,
      leaderMobile: true,
      leaderDepartment: true,
      createdAt: true,
      user: { select: { email: true, gameState: { select: { score: true } } } },
      members: { select: { name: true, mobile: true, department: true } },
    },
  });
  return teams.map((t) => ({
    id: t.id,
    teamName: t.teamName,
    leaderName: t.leaderName,
    leaderEmail: t.user.email,
    leaderMobile: t.leaderMobile,
    leaderDepartment: t.leaderDepartment,
    score: t.user.gameState?.score ?? 0,
    members: t.members,
    createdAt: t.createdAt.toISOString(),
  }));
}

const csvField = (v: unknown) => {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export async function buildAttendanceCsv(): Promise<string> {
  const teams = await getTeamsAdmin();
  const headers = [
    "Team Name", "Leader Name", "Leader Email", "Leader Phone", "Leader Department",
    "Member 1 Name", "Member 1 Phone", "Member 1 Dept",
    "Member 2 Name", "Member 2 Phone", "Member 2 Dept",
    "Member 3 Name", "Member 3 Phone", "Member 3 Dept",
    "Score", "Registered At",
  ];
  const rows = teams.map((t) => {
    const m = t.members;
    return [
      t.teamName, t.leaderName, t.leaderEmail, t.leaderMobile, t.leaderDepartment,
      m[0]?.name, m[0]?.mobile, m[0]?.department,
      m[1]?.name, m[1]?.mobile, m[1]?.department,
      m[2]?.name, m[2]?.mobile, m[2]?.department,
      t.score, t.createdAt,
    ].map(csvField).join(",");
  });
  return [headers.map(csvField).join(","), ...rows].join("\n");
}

/** Delete all non-admin users (cascades to team, members, game state). */
export async function resetAllTeams() {
  const result = await prisma.user.deleteMany({ where: { role: "USER" } });
  await events.leaderboard();
  return { deleted: result.count };
}

export async function getStats() {
  const [teams, states, completed] = await Promise.all([
    prisma.team.count(),
    prisma.gameState.aggregate({ _avg: { score: true }, _max: { score: true } }),
    prisma.gameState.count({ where: { isComplete: true } }),
  ]);
  return {
    totalTeams: teams,
    completedTeams: completed,
    averageScore: Math.round(states._avg.score ?? 0),
    topScore: states._max.score ?? 0,
  };
}
