import { describe, it, expect } from "vitest";
import { shuffleChallengeIds } from "@/lib/challengeOrder";

const ids = Array.from({ length: 40 }, (_, i) => `c${i}`);

describe("shuffleChallengeIds", () => {
  it("returns a permutation of the input ids", () => {
    const order = shuffleChallengeIds(ids);
    expect(order).toHaveLength(ids.length);
    expect([...order].sort()).toEqual([...ids].sort());
  });

  it("has no duplicates", () => {
    const order = shuffleChallengeIds(ids);
    expect(new Set(order).size).toBe(ids.length);
  });

  it("does not mutate the input array", () => {
    const input = [...ids];
    shuffleChallengeIds(input);
    expect(input).toEqual(ids);
  });

  it("produces different orders across teams (not fixed)", () => {
    const a = shuffleChallengeIds(ids).join(",");
    const b = shuffleChallengeIds(ids).join(",");
    expect(a).not.toBe(b);
  });
});
