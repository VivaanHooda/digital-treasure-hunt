import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { handle, json, fail, getClientIp, assertSameOrigin, ApiError } from "@/lib/api";
import { rateLimit, POLICIES } from "@/lib/rateLimit";
import { parseOrThrow, registerSchema } from "@/lib/validation";
import { shuffleChallengeIds } from "@/lib/challengeOrder";

export async function POST(req: Request) {
  return handle(async () => {
    assertSameOrigin(req);
    await rateLimit({ ...POLICIES.register, id: getClientIp(req) });

    const body = await req.json().catch(() => {
      throw new ApiError(400, "Invalid JSON body", "BAD_JSON");
    });
    const input = parseOrThrow(registerSchema, body);

    // The admin email is reserved (env-based admin account).
    if (process.env.ADMIN_EMAIL && input.email === process.env.ADMIN_EMAIL.toLowerCase()) {
      return fail(409, "An account with that email already exists.", "EMAIL_TAKEN");
    }

    const passwordHash = await bcrypt.hash(input.password, 12);

    // Freeze the dataset for this game from the current global selection, and
    // snapshot a shuffled copy of its challenge ids.
    const settings = await prisma.gameSettings.findUnique({ where: { id: "global" } });
    if (!settings?.selectedDatasetId) {
      return fail(409, "No challenge dataset has been selected by the admin yet.", "NO_DATASET");
    }
    const datasetId = settings.selectedDatasetId;
    const challenges = await prisma.challenge.findMany({
      where: { datasetId },
      select: { id: true },
    });
    if (challenges.length === 0) {
      return fail(409, "The selected challenge dataset has no challenges.", "EMPTY_DATASET");
    }
    const challengeIds = shuffleChallengeIds(challenges.map((c) => c.id));

    try {
      const user = await prisma.$transaction(async (tx) => {
        const created = await tx.user.create({
          data: {
            email: input.email,
            passwordHash,
            role: "USER",
            team: {
              create: {
                teamName: input.teamName,
                leaderName: input.leaderName,
                leaderMobile: input.leaderMobile,
                leaderDepartment: input.leaderDepartment,
                members: {
                  create: input.members.map((m) => ({
                    name: m.name,
                    mobile: m.mobile,
                    department: m.department,
                  })),
                },
              },
            },
            gameState: {
              create: {
                datasetId,
                challengeIds,
              },
            },
          },
        });
        return created;
      });

      return json({ ok: true, userId: user.id }, 201);
    } catch (e) {
      // Unique violation on email — generic message (no account enumeration).
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        return fail(409, "An account with that email already exists.", "EMAIL_TAKEN");
      }
      throw e;
    }
  });
}
