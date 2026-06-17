import { Prisma, type ChallengeType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api";
import { events } from "@/lib/events";
import { removeUpload } from "@/lib/uploads";

// ---- Lock / usage ---------------------------------------------------------

/** A dataset is locked while it's the selected dataset of a running game, or any
 *  team is mid-game on it. Locked datasets cannot be edited. */
export async function isDatasetLocked(datasetId: string): Promise<boolean> {
  const settings = await prisma.gameSettings.findUnique({ where: { id: "global" } });
  // Locked once the game is armed on this dataset, or any team is mid-game on it.
  if (settings && settings.isActive && settings.selectedDatasetId === datasetId) return true;
  const midGame = await prisma.gameState.count({ where: { datasetId, isComplete: false } });
  return midGame > 0;
}

/** True if any game has ever used the dataset (blocks hard-delete). */
export async function isDatasetUsed(datasetId: string): Promise<boolean> {
  return (await prisma.gameState.count({ where: { datasetId } })) > 0;
}

async function getDatasetOrThrow(id: string) {
  const d = await prisma.dataset.findUnique({ where: { id }, select: { id: true } });
  if (!d) throw new ApiError(404, "Dataset not found.", "NOT_FOUND");
}

async function assertUnlocked(datasetId: string) {
  if (await isDatasetLocked(datasetId)) {
    throw new ApiError(409, "This dataset is locked while a game using it is in progress.", "DATASET_LOCKED");
  }
}

// ---- Dataset CRUD ---------------------------------------------------------

export async function listDatasets() {
  const [datasets, settings, midGame] = await Promise.all([
    prisma.dataset.findMany({
      orderBy: { createdAt: "asc" },
      include: { challenges: { select: { type: true } }, _count: { select: { gameStates: true } } },
    }),
    prisma.gameSettings.findUnique({ where: { id: "global" } }),
    prisma.gameState.groupBy({ by: ["datasetId"], where: { isComplete: false }, _count: { _all: true } }),
  ]);

  const armed = !!(settings && settings.isActive);
  const midSet = new Set(midGame.map((m) => m.datasetId));

  return datasets.map((d) => ({
    id: d.id,
    name: d.name,
    challengeCount: d.challenges.length,
    pictureCount: d.challenges.filter((c) => c.type === "PICTURE").length,
    riddleCount: d.challenges.filter((c) => c.type === "RIDDLE").length,
    used: d._count.gameStates > 0,
    // "Selected"/locked only once the game is actually armed on this dataset.
    locked: (armed && settings!.selectedDatasetId === d.id) || midSet.has(d.id),
    selected: armed && settings!.selectedDatasetId === d.id,
    createdAt: d.createdAt.toISOString(),
  }));
}

export async function createDataset(name: string) {
  try {
    const d = await prisma.dataset.create({ data: { name } });
    return { id: d.id, name: d.name };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new ApiError(409, "A dataset with that name already exists.", "NAME_TAKEN");
    }
    throw e;
  }
}

export async function renameDataset(id: string, name: string) {
  await getDatasetOrThrow(id);
  await assertUnlocked(id);
  try {
    await prisma.dataset.update({ where: { id }, data: { name } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new ApiError(409, "A dataset with that name already exists.", "NAME_TAKEN");
    }
    throw e;
  }
  return { ok: true };
}

export async function deleteDataset(id: string) {
  await getDatasetOrThrow(id);
  if (await isDatasetUsed(id)) {
    throw new ApiError(409, "Cannot delete a dataset that a game has used.", "DATASET_USED");
  }
  // Best-effort cleanup of locally-uploaded images before cascade delete.
  const imgs = await prisma.challenge.findMany({
    where: { datasetId: id, imageUrl: { startsWith: "/uploads/" } },
    select: { imageUrl: true },
  });
  await prisma.dataset.delete({ where: { id } });
  await Promise.all(imgs.map((c) => removeUpload(c.imageUrl)));
  await events.settings();
  return { ok: true };
}

// ---- Challenge CRUD -------------------------------------------------------

export type ChallengeInput = {
  type: ChallengeType;
  title: string;
  description: string;
  imageUrl?: string;
  latitude: number;
  longitude: number;
  marginOfError: number;
  points: number;
};

export async function listChallenges(datasetId: string) {
  await getDatasetOrThrow(datasetId);
  // Admin view — includes coordinates (admin needs to edit them).
  return prisma.challenge.findMany({ where: { datasetId }, orderBy: { position: "asc" } });
}

export async function createChallenge(datasetId: string, input: ChallengeInput) {
  await getDatasetOrThrow(datasetId);
  await assertUnlocked(datasetId);
  const max = await prisma.challenge.aggregate({ where: { datasetId }, _max: { position: true } });
  const c = await prisma.challenge.create({
    data: { datasetId, position: (max._max.position ?? -1) + 1, ...input, imageUrl: input.imageUrl ?? null },
  });
  return { id: c.id };
}

export async function updateChallenge(id: string, input: Partial<ChallengeInput>) {
  const existing = await prisma.challenge.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, "Challenge not found.", "NOT_FOUND");
  await assertUnlocked(existing.datasetId);

  const finalType = input.type ?? existing.type;
  const finalImage = input.imageUrl !== undefined ? input.imageUrl : existing.imageUrl;
  if (finalType === "PICTURE" && !finalImage) {
    throw new ApiError(400, "Picture challenges require an image.", "VALIDATION_ERROR");
  }

  // If the image is being replaced, remove the old local upload.
  if (input.imageUrl !== undefined && existing.imageUrl && existing.imageUrl !== input.imageUrl) {
    await removeUpload(existing.imageUrl);
  }

  await prisma.challenge.update({
    where: { id },
    data: { ...input, imageUrl: input.imageUrl !== undefined ? (input.imageUrl ?? null) : undefined },
  });
  return { ok: true };
}

export async function deleteChallenge(id: string) {
  const existing = await prisma.challenge.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, "Challenge not found.", "NOT_FOUND");
  await assertUnlocked(existing.datasetId);
  await prisma.challenge.delete({ where: { id } });
  await removeUpload(existing.imageUrl);
  return { ok: true };
}
