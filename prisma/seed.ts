import { PrismaClient, ChallengeType } from "@prisma/client";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const prisma = new PrismaClient();
const __dirname = dirname(fileURLToPath(import.meta.url));

type RawChallenge = {
  datasetId: "A" | "B";
  index: number;
  type: string;
  title: string;
  description: string;
  imageUrl: string | null;
  latitude: number;
  longitude: number;
  marginOfError: number;
  points: number;
};

async function seedDataset(name: string, rows: RawChallenge[]) {
  const dataset = await prisma.dataset.upsert({
    where: { name },
    create: { name },
    update: {},
  });
  for (const c of rows) {
    await prisma.challenge.upsert({
      where: { datasetId_position: { datasetId: dataset.id, position: c.index } },
      create: {
        datasetId: dataset.id,
        position: c.index,
        type: c.type as ChallengeType,
        title: c.title,
        description: c.description,
        imageUrl: c.imageUrl,
        latitude: c.latitude,
        longitude: c.longitude,
        marginOfError: c.marginOfError,
        points: c.points,
      },
      update: {
        type: c.type as ChallengeType,
        title: c.title,
        description: c.description,
        imageUrl: c.imageUrl,
        latitude: c.latitude,
        longitude: c.longitude,
        marginOfError: c.marginOfError,
        points: c.points,
      },
    });
  }
  return dataset;
}

async function main() {
  // 1. Challenge datasets (migrated from the original A/B JSON into named datasets).
  const raw = JSON.parse(readFileSync(join(__dirname, "challenges.json"), "utf-8")) as {
    A: RawChallenge[];
    B: RawChallenge[];
  };
  const setA = await seedDataset("Set A", raw.A);
  const setB = await seedDataset("Set B", raw.B);
  console.log(`Seeded datasets: Set A (${raw.A.length}), Set B (${raw.B.length}).`);

  // 2. Global game settings singleton (default selection = Set A).
  const durationMs = Number(process.env.GAME_DEFAULT_DURATION_MS ?? 7200000);
  await prisma.gameSettings.upsert({
    where: { id: "global" },
    create: {
      id: "global",
      startTime: new Date(),
      durationMs,
      isActive: false, // IDLE — admin starts a game explicitly
      selectedDatasetId: setA.id, // default candidate dataset
    },
    update: {},
  });
  console.log("Ensured global game settings.");
  void setB;

  // Admin is NOT stored in the DB — it authenticates from ADMIN_EMAIL /
  // ADMIN_PASSWORD env vars at runtime (see src/auth.ts).
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
