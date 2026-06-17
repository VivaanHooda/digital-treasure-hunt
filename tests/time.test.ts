import { describe, it, expect } from "vitest";
import { computeTime, type TimeSettings } from "@/lib/time";

const base = (over: Partial<TimeSettings> = {}): TimeSettings => ({
  startTime: new Date(1_000_000),
  durationMs: 7_200_000, // 2h
  isPaused: false,
  pausedAt: null,
  totalPauseMs: 0,
  ...over,
});

describe("computeTime", () => {
  it("reports time until start before the game begins", () => {
    const t = computeTime(base({ startTime: new Date(2_000_000) }), 1_000_000);
    expect(t.hasStarted).toBe(false);
    expect(t.timeUntilStart).toBe(1_000_000);
    expect(t.timeRemaining).toBe(7_200_000);
  });

  it("counts down while running", () => {
    const t = computeTime(base(), 1_000_000 + 60_000); // 1 min in
    expect(t.hasStarted).toBe(true);
    expect(t.timeRemaining).toBe(7_200_000 - 60_000);
  });

  it("FREEZES the clock during an in-progress pause (audit H1)", () => {
    const settings = base({ isPaused: true, pausedAt: new Date(1_000_000 + 60_000) });
    const atPauseStart = computeTime(settings, 1_000_000 + 60_000);
    const muchLater = computeTime(settings, 1_000_000 + 60_000 + 5_000_000);
    expect(muchLater.timeRemaining).toBe(atPauseStart.timeRemaining);
  });

  it("accounts for completed pauses via totalPauseMs", () => {
    const t = computeTime(base({ totalPauseMs: 120_000 }), 1_000_000 + 300_000);
    // elapsed = 300_000 - 120_000 = 180_000
    expect(t.timeRemaining).toBe(7_200_000 - 180_000);
  });

  it("never goes negative", () => {
    const t = computeTime(base(), 1_000_000 + 10 * 3_600_000);
    expect(t.timeRemaining).toBe(0);
  });
});
