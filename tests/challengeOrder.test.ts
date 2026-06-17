import { describe, it, expect } from "vitest";
import { generateChallengeOrder } from "@/lib/challengeOrder";

describe("generateChallengeOrder", () => {
  it("returns a permutation of 0..n-1", () => {
    const order = generateChallengeOrder(40);
    expect(order).toHaveLength(40);
    expect([...order].sort((a, b) => a - b)).toEqual(Array.from({ length: 40 }, (_, i) => i));
  });

  it("has no duplicates", () => {
    const order = generateChallengeOrder(40);
    expect(new Set(order).size).toBe(40);
  });

  it("produces different orders across teams (not fixed)", () => {
    const a = generateChallengeOrder(40).join(",");
    const b = generateChallengeOrder(40).join(",");
    expect(a).not.toBe(b);
  });
});
