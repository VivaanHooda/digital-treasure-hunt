import { PrismaClient, Dataset, ChallengeType } from "@prisma/client";
import bcrypt from "bcryptjs";
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

async function main() {
  // 1. Challenges (idempotent upsert by [datasetId, index]).
  const raw = JSON.parse(
    readFileSync(join(__dirname, "challenges.json"), "utf-8"),
  ) as { A: RawChallenge[]; B: RawChallenge[] };

  const all = [...raw.A, ...raw.B];
  for (const c of all) {
    await prisma.challenge.upsert({
      where: { datasetId_index: { datasetId: c.datasetId as Dataset, index: c.index } },
      create: {
        datasetId: c.datasetId as Dataset,
        index: c.index,
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
  console.log(`Seeded ${all.length} challenges (A=${raw.A.length}, B=${raw.B.length}).`);

  // 2. Global game settings singleton.
  const durationMs = Number(process.env.GAME_DEFAULT_DURATION_MS ?? 7200000);
  await prisma.gameSettings.upsert({
    where: { id: "global" },
    create: {
      id: "global",
      startTime: new Date(),
      durationMs,
      isActive: true,
      selectedDataset: Dataset.A,
    },
    update: {},
  });
  console.log("Ensured global game settings.");

  // 3. Admin account (from env; password hashed, never shipped to client).
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword) {
    console.warn("ADMIN_EMAIL/ADMIN_PASSWORD not set — skipping admin creation.");
  } else {
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    await prisma.user.upsert({
      where: { email: adminEmail.toLowerCase() },
      create: { email: adminEmail.toLowerCase(), passwordHash, role: "ADMIN" },
      update: { passwordHash, role: "ADMIN" },
    });
    console.log(`Ensured admin user: ${adminEmail.toLowerCase()}`);
  }
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
