import { prisma } from "@/lib/prisma";
import { events } from "@/lib/events";
import { ApiError } from "@/lib/api";
import { ADMIN_ID } from "@/lib/config";

// ---- Settings -------------------------------------------------------------

export async function getSettingsAdmin() {
  const s = await prisma.gameSettings.findUnique({
    where: { id: "global" },
    include: { selectedDataset: { select: { name: true } } },
  });
  if (!s) throw new ApiError(500, "Game settings missing", "NO_SETTINGS");
  return {
    startTime: s.startTime.toISOString(),
    durationMs: s.durationMs,
    isPaused: s.isPaused,
    pausedAt: s.pausedAt?.toISOString() ?? null,
    totalPauseMs: s.totalPauseMs,
    isActive: s.isActive,
    selectedDatasetId: s.selectedDatasetId,
    selectedDatasetName: s.selectedDataset?.name ?? null,
    updatedAt: s.updatedAt.toISOString(),
  };
}

export async function updateSettings(input: {
  startTime?: string;
  durationMs?: number;
  selectedDatasetId?: string | null;
  isActive?: boolean;
}) {
  const data: Record<string, unknown> = {};
  if (input.startTime !== undefined) data.startTime = new Date(input.startTime);
  if (input.durationMs !== undefined) data.durationMs = input.durationMs;
  if (input.isActive !== undefined) data.isActive = input.isActive;

  // Settings are frozen once a game is armed; stop the game to change them.
  const current = await prisma.gameSettings.findUnique({ where: { id: "global" } });
  if (!current) throw new ApiError(500, "Game settings missing", "NO_SETTINGS");
  if (current.isActive) {
    throw new ApiError(409, "Stop the current game before changing settings.", "GAME_ACTIVE");
  }

  if (input.selectedDatasetId !== undefined && input.selectedDatasetId !== null) {
    const count = await prisma.challenge.count({ where: { datasetId: input.selectedDatasetId } });
    if (count === 0) throw new ApiError(400, "That dataset has no challenges.", "EMPTY_DATASET");
    data.selectedDatasetId = input.selectedDatasetId;
  } else if (input.selectedDatasetId === null) {
    data.selectedDatasetId = null;
  }

  await prisma.gameSettings.update({ where: { id: "global" }, data });
  await events.settings();
  return getSettingsAdmin();
}

// ---- Game lifecycle (start / stop) ----------------------------------------

/** Arm a game with the given config. Starts immediately if startTime <= now,
 *  otherwise schedules it. Settings become locked until the game is stopped. */
export async function startGame(input: {
  startTime: string;
  durationMs: number;
  selectedDatasetId: string;
}) {
  const current = await prisma.gameSettings.findUnique({ where: { id: "global" } });
  if (current?.isActive) {
    throw new ApiError(409, "A game is already running. Stop it first.", "ALREADY_RUNNING");
  }
  const count = await prisma.challenge.count({ where: { datasetId: input.selectedDatasetId } });
  if (count === 0) throw new ApiError(400, "That dataset has no challenges.", "EMPTY_DATASET");

  await prisma.gameSettings.update({
    where: { id: "global" },
    data: {
      isActive: true,
      startTime: new Date(input.startTime),
      durationMs: input.durationMs,
      selectedDatasetId: input.selectedDatasetId,
      isPaused: false,
      pausedAt: null,
      totalPauseMs: 0,
    },
  });
  await events.settings();
  await events.leaderboard();
  return getSettingsAdmin();
}

/** Stop and discard the current game (password-gated). Ends every in-progress
 *  game, disarms, and deselects the dataset so settings can be reconfigured. */
export async function stopGame(password: string) {
  if (!process.env.ADMIN_PASSWORD || password !== process.env.ADMIN_PASSWORD) {
    throw new ApiError(403, "Incorrect admin password.", "BAD_PASSWORD");
  }
  await prisma.$transaction([
    prisma.gameState.updateMany({ where: { isComplete: false }, data: { isComplete: true } }),
    prisma.gameSettings.update({
      where: { id: "global" },
      data: { isActive: false, selectedDatasetId: null, isPaused: false, pausedAt: null, totalPauseMs: 0 },
    }),
  ]);
  await events.settings();
  await events.leaderboard();
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
      // The env-admin has no User row; store null author for it.
      createdById: adminId === ADMIN_ID ? null : adminId,
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
  // One row per person. Highest-scoring teams first (doubles as a leaderboard);
  // teams with 0 points are included. Leader row carries the email; members "Nil".
  const teams = [...(await getTeamsAdmin())].sort((a, b) => b.score - a.score);

  const headers = ["Name", "Team Name", "Mobile", "Department", "Email", "Team Score"];
  const lines = [headers.map(csvField).join(",")];

  for (const t of teams) {
    lines.push([t.leaderName, t.teamName, t.leaderMobile, t.leaderDepartment, t.leaderEmail, t.score].map(csvField).join(","));
    for (const m of t.members) {
      lines.push([m.name, t.teamName, m.mobile, m.department, "Nil", t.score].map(csvField).join(","));
    }
  }
  return lines.join("\n");
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
