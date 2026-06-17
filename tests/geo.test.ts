import { describe, it, expect } from "vitest";
import { haversineMeters, round2 } from "@/lib/geo";

describe("haversineMeters", () => {
  it("is zero for identical points", () => {
    expect(haversineMeters(12.92, 77.5, 12.92, 77.5)).toBe(0);
  });

  it("approximates one degree of latitude as ~111km", () => {
    const d = haversineMeters(12.0, 77.5, 13.0, 77.5);
    expect(d).toBeGreaterThan(110_000);
    expect(d).toBeLessThan(112_000);
  });

  it("computes a small campus-scale distance plausibly", () => {
    const d = haversineMeters(12.924031, 77.501187, 12.923653, 77.501361);
    expect(d).toBeGreaterThan(20);
    expect(d).toBeLessThan(80);
  });
});

describe("round2", () => {
  it("rounds to two decimals", () => {
    expect(round2(13977.12345)).toBe(13977.12);
  });
});
