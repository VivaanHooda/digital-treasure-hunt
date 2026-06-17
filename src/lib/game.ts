import { Prisma, type GameSettings } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api";
import { events } from "@/lib/events";
import { computeTime } from "@/lib/time";
import { haversineMeters, round2 } from "@/lib/geo";
import {
  TOTAL_CHALLENGES,
  COOLDOWN_MS,
  SKIP_PENALTY,
  MAX_SKIPS,
  MAX_ACCURACY_MULTIPLIER,
} from "@/lib/config";

// ---------------------------------------------------------------------------
// Settings + time
// ---------------------------------------------------------------------------

async function getSettings(): Promise<GameSettings> {
  const s = await prisma.gameSettings.findUnique({ where: { id: "global" } });
  if (!s) throw new ApiError(500, "Game settings are not configured", "NO_SETTINGS");
  return s;
}

export { computeTime };

function assertPlayable(settings: GameSettings, time: ReturnType<typeof computeTime>) {
  if (!settings.isActive) throw new ApiError(403, "The game is not active.", "INACTIVE");
  if (!time.hasStarted) throw new ApiError(403, "The game has not started yet.", "NOT_STARTED");
  if (settings.isPaused) throw new ApiError(403, "The game is currently paused.", "PAUSED");
  if (time.timeRemaining <= 0) throw new ApiError(403, "The game time is up.", "TIME_UP");
}

// ---------------------------------------------------------------------------
// Read: sanitized game state for a user (NEVER includes coordinates)
// ---------------------------------------------------------------------------

function sanitizeChallenge(
  c: { type: string; title: string; description: string; imageUrl: string | null; points: number; marginOfError: number },
  position: number,
) {
  return {
    number: position + 1,
    total: TOTAL_CHALLENGES,
    type: c.type,
    title: c.title,
    description: c.description,
    imageUrl: c.imageUrl,
    points: c.points,
    marginOfError: c.marginOfError,
  };
}

export async function getGameStateForUser(userId: string) {
  const [settings, gs] = await Promise.all([
    getSettings(),
    prisma.gameState.findUnique({ where: { userId } }),
  ]);
  if (!gs) throw new ApiError(404, "Game state not found.", "NO_GAME");

  const now = Date.now();
  const time = computeTime(settings, now);

  const [completions, skippedCount] = await Promise.all([
    prisma.completion.findMany({
      where: { gameStateId: gs.id },
      select: { challengeIndex: true },
    }),
    prisma.skip.count({ where: { gameStateId: gs.id } }),
  ]);

  // Picture/riddle breakdown of completed challenges.
  let pictures = 0;
  let riddles = 0;
  if (completions.length) {
    const types = await prisma.challenge.findMany({
      where: { datasetId: gs.datasetId, index: { in: completions.map((c) => c.challengeIndex) } },
      select: { type: true },
    });
    pictures = types.filter((t) => t.type === "PICTURE").length;
    riddles = types.filter((t) => t.type === "RIDDLE").length;
  }

  // Current challenge (no coordinates).
  let challenge = null;
  if (!gs.isComplete && gs.currentIndex < TOTAL_CHALLENGES) {
    const actualIndex = gs.challengeOrder[gs.currentIndex];
    const c = await prisma.challenge.findUnique({
      where: { datasetId_index: { datasetId: gs.datasetId, index: actualIndex } },
    });
    if (c) challenge = sanitizeChallenge(c, gs.currentIndex);
  }

  const cooldownRemaining = gs.cooldownEndsAt
    ? Math.max(0, Math.ceil((gs.cooldownEndsAt.getTime() - now) / 1000))
    : 0;

  return {
    serverNow: now,
    settings: {
      startTime: settings.startTime.toISOString(),
      durationMs: settings.durationMs,
      isPaused: settings.isPaused,
      isActive: settings.isActive,
      hasStarted: time.hasStarted,
      timeRemaining: time.timeRemaining,
      timeUntilStart: time.timeUntilStart,
    },
    game: {
      score: gs.score,
      currentNumber: Math.min(gs.currentIndex + 1, TOTAL_CHALLENGES),
      total: TOTAL_CHALLENGES,
      completedCount: completions.length,
      skippedCount,
      skipsUsed: gs.skipsUsed,
      remainingSkips: Math.max(0, MAX_SKIPS - gs.skipsUsed),
      maxSkips: MAX_SKIPS,
      skipPenalty: SKIP_PENALTY,
      picturesCompleted: pictures,
      riddlesCompleted: riddles,
      isComplete: gs.isComplete,
      cooldownRemaining,
    },
    challenge,
  };
}

// ---------------------------------------------------------------------------
// Write: verify a location submission (server holds the coordinates)
// ---------------------------------------------------------------------------

export type VerifyInput = { latitude: number; longitude: number; accuracy?: number };

export async function verifyLocation(userId: string, input: VerifyInput) {
  const settings = await getSettings();
  assertPlayable(settings, computeTime(settings));

  let result;
  try {
    result = await prisma.$transaction(async (tx) => {
      const gs = await tx.gameState.findUnique({ where: { userId } });
      if (!gs) throw new ApiError(404, "Game state not found.", "NO_GAME");
      if (gs.isComplete || gs.currentIndex >= TOTAL_CHALLENGES) {
        throw new ApiError(409, "The game is already complete.", "COMPLETE");
      }

      const now = Date.now();
      if (gs.cooldownEndsAt && now < gs.cooldownEndsAt.getTime()) {
        const remaining = Math.ceil((gs.cooldownEndsAt.getTime() - now) / 1000);
        throw new ApiError(429, `Please wait ${remaining}s before trying again.`, "COOLDOWN");
      }

      const actualIndex = gs.challengeOrder[gs.currentIndex];
      const challenge = await tx.challenge.findUnique({
        where: { datasetId_index: { datasetId: gs.datasetId, index: actualIndex } },
      });
      if (!challenge) throw new ApiError(500, "Challenge data missing.", "NO_CHALLENGE");

      const distance = round2(
        haversineMeters(input.latitude, input.longitude, challenge.latitude, challenge.longitude),
      );

      // Reject untrustworthy GPS fixes (does not burn a cooldown).
      if (input.accuracy != null && input.accuracy > challenge.marginOfError * MAX_ACCURACY_MULTIPLIER) {
        await tx.submission.create({
          data: {
            gameStateId: gs.id,
            challengeIndex: actualIndex,
            latitude: input.latitude,
            longitude: input.longitude,
            accuracy: input.accuracy,
            distance,
            success: false,
          },
        });
        throw new ApiError(
          422,
          `GPS accuracy too low (±${Math.round(input.accuracy)}m). Move to open sky and retry.`,
          "LOW_ACCURACY",
        );
      }

      const success = distance <= challenge.marginOfError;
      await tx.submission.create({
        data: {
          gameStateId: gs.id,
          challengeIndex: actualIndex,
          latitude: input.latitude,
          longitude: input.longitude,
          accuracy: input.accuracy ?? null,
          distance,
          success,
        },
      });

      if (success) {
        await tx.completion.create({
          data: { gameStateId: gs.id, challengeIndex: actualIndex, pointsAwarded: challenge.points },
        });
        const nextIndex = gs.currentIndex + 1;
        const isComplete = nextIndex >= TOTAL_CHALLENGES;
        await tx.gameState.update({
          where: { id: gs.id },
          data: {
            score: { increment: challenge.points },
            currentIndex: nextIndex,
            cooldownEndsAt: null,
            lastCompletedAt: new Date(),
            lastActivityAt: new Date(),
            isComplete,
          },
        });
        return {
          correct: true,
          distance,
          marginOfError: challenge.marginOfError,
          points: challenge.points,
          isComplete,
          cooldownRemaining: 0,
        };
      }

      const cooldownEndsAt = new Date(now + COOLDOWN_MS);
      await tx.gameState.update({
        where: { id: gs.id },
        data: { cooldownEndsAt, lastActivityAt: new Date() },
      });
      return {
        correct: false,
        distance,
        marginOfError: challenge.marginOfError,
        isComplete: false,
        cooldownRemaining: Math.ceil(COOLDOWN_MS / 1000),
      };
    });
  } catch (e) {
    // Concurrent duplicate completion of the same slot — safe to treat as benign.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new ApiError(409, "That submission was already recorded.", "DUPLICATE");
    }
    throw e;
  }

  events.userGameState(userId);
  if (result.correct) events.leaderboard();
  return result;
}

// ---------------------------------------------------------------------------
// Write: skip the current challenge (tracked separately from completions)
// ---------------------------------------------------------------------------

export async function skipChallenge(userId: string) {
  const settings = await getSettings();
  assertPlayable(settings, computeTime(settings));

  let result;
  try {
    result = await prisma.$transaction(async (tx) => {
      const gs = await tx.gameState.findUnique({ where: { userId } });
      if (!gs) throw new ApiError(404, "Game state not found.", "NO_GAME");
      if (gs.isComplete || gs.currentIndex >= TOTAL_CHALLENGES) {
        throw new ApiError(409, "The game is already complete.", "COMPLETE");
      }
      if (gs.skipsUsed >= MAX_SKIPS) {
        throw new ApiError(403, `No skips remaining (max ${MAX_SKIPS}).`, "NO_SKIPS");
      }

      const actualIndex = gs.challengeOrder[gs.currentIndex];
      await tx.skip.create({
        data: { gameStateId: gs.id, challengeIndex: actualIndex, penalty: SKIP_PENALTY },
      });

      const nextIndex = gs.currentIndex + 1;
      const isComplete = nextIndex >= TOTAL_CHALLENGES;
      await tx.gameState.update({
        where: { id: gs.id },
        data: {
          score: Math.max(0, gs.score - SKIP_PENALTY),
          skipsUsed: { increment: 1 },
          currentIndex: nextIndex,
          cooldownEndsAt: null,
          lastActivityAt: new Date(),
          isComplete,
        },
      });
      return {
        skipped: true,
        isComplete,
        penalty: SKIP_PENALTY,
        remainingSkips: Math.max(0, MAX_SKIPS - (gs.skipsUsed + 1)),
      };
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new ApiError(409, "That challenge was already skipped.", "DUPLICATE");
    }
    throw e;
  }

  events.userGameState(userId);
  events.leaderboard();
  return result;
}
