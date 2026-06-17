// Central game constants (server-authoritative). Tunable via env.
export const TOTAL_CHALLENGES = 40;
export const COOLDOWN_MS = Number(process.env.COOLDOWN_MS ?? 60_000);
export const SKIP_PENALTY = Number(process.env.SKIP_PENALTY ?? 5);
export const MAX_SKIPS = Number(process.env.MAX_SKIPS ?? 3);
export const DEFAULT_GAME_DURATION_MS = Number(
  process.env.GAME_DEFAULT_DURATION_MS ?? 7_200_000,
);
// Reject GPS fixes too imprecise to trust against the challenge margin.
export const MAX_ACCURACY_MULTIPLIER = 3; // accuracy must be <= margin * this
