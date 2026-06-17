import { randomInt } from "node:crypto";
import { TOTAL_CHALLENGES } from "@/lib/config";

/**
 * A cryptographically-random per-team permutation of challenge indexes.
 * Stored on GameState at registration so each team gets its own order
 * (prevents teams from simply following each other) and the order is fixed
 * for the life of that game.
 */
export function generateChallengeOrder(n: number = TOTAL_CHALLENGES): number[] {
  const arr = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = randomInt(0, i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
