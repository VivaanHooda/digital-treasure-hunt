import { randomInt } from "node:crypto";

/**
 * A cryptographically-random per-team permutation of the dataset's challenge ids.
 * Snapshotted onto GameState at registration so each team gets its own order
 * (prevents teams from following each other) and the set/order is fixed for the
 * life of that game even if the dataset is later edited.
 */
export function shuffleChallengeIds(ids: string[]): string[] {
  const arr = [...ids];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randomInt(0, i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
