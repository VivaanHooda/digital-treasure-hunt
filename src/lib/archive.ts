import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api";

/** Per-team result frozen into an archive's `data` blob. */
export type ArchiveTeamResult = {
  rank: number;
  teamName: string;
  leaderName: string;
  leaderEmail: string;
  leaderMobile: string;
  leaderDepartment: string;
  members: { name: string; mobile: string; department: string }[];
  score: number;
  completedCount: number;
  skipsUsed: number;
  picturesCompleted: number;
  riddlesCompleted: number;
  total: number;
  finished: boolean;
  startedAt: string;
  lastCompletedAt: string | null;
};

/**
 * Freeze the current game (config + full final standings) into a GameArchive
 * row. Self-contained — survives a later team reset. Throws if no teams exist.
 */
export async function archiveCurrentGame(label?: string) {
  const settings = await prisma.gameSettings.findUnique({
    where: { id: "global" },
    include: { selectedDataset: { select: { name: true } } },
  });

  const states = await prisma.gameState.findMany({
    select: {
      score: true,
      skipsUsed: true,
      currentIndex: true,
      challengeIds: true,
      startedAt: true,
      lastCompletedAt: true,
      user: {
        select: {
          email: true,
          team: {
            select: {
              teamName: true,
              leaderName: true,
              leaderMobile: true,
              leaderDepartment: true,
              members: { select: { name: true, mobile: true, department: true } },
            },
          },
        },
      },
      completions: { select: { challengeId: true } },
    },
  });
  if (states.length === 0) throw new ApiError(400, "No teams to archive.", "NO_TEAMS");

  // Bulk-resolve challenge types for the picture/riddle breakdown.
  const completedIds = [...new Set(states.flatMap((s) => s.completions.map((c) => c.challengeId)))];
  const types = completedIds.length
    ? await prisma.challenge.findMany({ where: { id: { in: completedIds } }, select: { id: true, type: true } })
    : [];
  const typeById = new Map(types.map((t) => [t.id, t.type]));

  const rows = states.map((s) => {
    const total = s.challengeIds.length;
    let pictures = 0;
    let riddles = 0;
    for (const c of s.completions) {
      const t = typeById.get(c.challengeId);
      if (t === "PICTURE") pictures++;
      else if (t === "RIDDLE") riddles++;
    }
    return {
      teamName: s.user.team?.teamName ?? "Unknown Team",
      leaderName: s.user.team?.leaderName ?? "—",
      leaderEmail: s.user.email,
      leaderMobile: s.user.team?.leaderMobile ?? "",
      leaderDepartment: s.user.team?.leaderDepartment ?? "",
      members: s.user.team?.members ?? [],
      score: s.score,
      completedCount: s.completions.length,
      skipsUsed: s.skipsUsed,
      picturesCompleted: pictures,
      riddlesCompleted: riddles,
      total,
      finished: total > 0 && s.currentIndex >= total,
      startedAt: s.startedAt.toISOString(),
      lastCompletedAt: s.lastCompletedAt?.toISOString() ?? null,
    };
  });

  // Same ordering as the live leaderboard: score desc, earliest finisher first.
  rows.sort(
    (a, b) =>
      b.score - a.score ||
      (a.lastCompletedAt ? Date.parse(a.lastCompletedAt) : Infinity) -
        (b.lastCompletedAt ? Date.parse(b.lastCompletedAt) : Infinity),
  );
  const data: ArchiveTeamResult[] = rows.map((r, i) => ({ rank: i + 1, ...r }));

  const datasetName = settings?.selectedDataset?.name ?? "—";
  const defaultLabel = `${datasetName} · ${new Date().toLocaleDateString("en-GB")}`;

  const archive = await prisma.gameArchive.create({
    data: {
      label: (label?.trim() || defaultLabel).slice(0, 120),
      datasetName,
      startTime: settings?.startTime ?? new Date(),
      durationMs: settings?.durationMs ?? 0,
      teamCount: data.length,
      topScore: data[0]?.score ?? 0,
      finishedCount: data.filter((d) => d.finished).length,
      data: data as unknown as Prisma.InputJsonValue,
    },
  });
  return { id: archive.id, teamCount: data.length };
}

export async function listArchives() {
  const rows = await prisma.gameArchive.findMany({
    orderBy: { archivedAt: "desc" },
    select: {
      id: true, label: true, datasetName: true, startTime: true, durationMs: true,
      teamCount: true, topScore: true, finishedCount: true, archivedAt: true,
    },
  });
  return rows.map((r) => ({
    ...r,
    startTime: r.startTime.toISOString(),
    archivedAt: r.archivedAt.toISOString(),
  }));
}

export async function getArchive(id: string) {
  const r = await prisma.gameArchive.findUnique({ where: { id } });
  if (!r) throw new ApiError(404, "Archive not found.", "NOT_FOUND");
  return {
    id: r.id,
    label: r.label,
    datasetName: r.datasetName,
    startTime: r.startTime.toISOString(),
    durationMs: r.durationMs,
    teamCount: r.teamCount,
    topScore: r.topScore,
    finishedCount: r.finishedCount,
    archivedAt: r.archivedAt.toISOString(),
    teams: (r.data as unknown as ArchiveTeamResult[]) ?? [],
  };
}

export async function deleteArchive(id: string) {
  await prisma.gameArchive.delete({ where: { id } }).catch(() => {
    throw new ApiError(404, "Archive not found.", "NOT_FOUND");
  });
  return { ok: true };
}

const csvField = (v: unknown) => {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Attendance CSV for a past game — one row per person (leader + members),
 *  highest-scoring teams first. Mirrors the live attendance export. */
export async function buildArchiveAttendanceCsv(id: string): Promise<{ csv: string; label: string }> {
  const archive = await getArchive(id);
  const headers = ["Name", "Team Name", "Mobile", "Department", "Email", "Team Score"];
  const lines = [headers.map(csvField).join(",")];
  // archive.teams are already ordered by rank (score desc).
  for (const t of archive.teams) {
    lines.push([t.leaderName, t.teamName, t.leaderMobile, t.leaderDepartment, t.leaderEmail, t.score].map(csvField).join(","));
    for (const m of t.members) {
      lines.push([m.name, t.teamName, m.mobile, m.department, "Nil", t.score].map(csvField).join(","));
    }
  }
  return { csv: lines.join("\n"), label: archive.label };
}
