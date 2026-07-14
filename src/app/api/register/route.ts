import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { handle, json, fail, getClientIp, assertSameOrigin, ApiError } from "@/lib/api";
import { rateLimit, POLICIES } from "@/lib/rateLimit";
import { parseOrThrow, registerSchema } from "@/lib/validation";
import { shuffleChallengeIds } from "@/lib/challengeOrder";

// Public: the register page reads the current team-size range to render slots.
export async function GET(req: Request) {
  return handle(async () => {
    await rateLimit({ ...POLICIES.read, id: getClientIp(req) });
    const s = await prisma.gameSettings.findUnique({
      where: { id: "global" },
      select: { minTeamSize: true, maxTeamSize: true },
    });
    // Fallbacks mirror the schema defaults (min 3 / max 4).
    return json({ minTeamSize: s?.minTeamSize ?? 3, maxTeamSize: s?.maxTeamSize ?? 4 });
  });
}

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

    // Emails + mobiles must be unique across the whole team (leader + members).
    const emails = [input.email, ...input.members.map((m) => m.email)];
    if (new Set(emails).size !== emails.length) {
      return fail(409, "Each member needs a unique email address.", "DUP_EMAIL");
    }
    const mobiles = [input.leaderMobile, ...input.members.map((m) => m.mobile)];
    if (new Set(mobiles).size !== mobiles.length) {
      return fail(409, "Each member needs a unique mobile number.", "DUP_MOBILE");
    }

    const passwordHash = await bcrypt.hash(input.password, 12);

    // Freeze the dataset for this game from the current global selection, and
    // snapshot a shuffled copy of its challenge ids.
    const settings = await prisma.gameSettings.findUnique({ where: { id: "global" } });
    if (!settings?.selectedDatasetId) {
      return fail(409, "No challenge dataset has been selected by the admin yet.", "NO_DATASET");
    }

    // Enforce the admin-configured team size (total includes the leader).
    const total = input.members.length + 1;
    if (total < settings.minTeamSize || total > settings.maxTeamSize) {
      const range = settings.minTeamSize === settings.maxTeamSize
        ? `exactly ${settings.minTeamSize}`
        : `${settings.minTeamSize}–${settings.maxTeamSize}`;
      return fail(409, `A team must have ${range} people (including the leader).`, "TEAM_SIZE");
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
                    email: m.email,
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
