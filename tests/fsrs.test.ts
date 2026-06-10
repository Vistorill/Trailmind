import { describe, it, expect } from "vitest";
import { calculateFSRS, initialFSRSState } from "../server/lib/fsrs";

describe("FSRS algorithm", () => {
  it("resets on rating 1 (Again)", () => {
    const state = { stability: 10, difficulty: 5, reps: 3, lapses: 0 };
    const result = calculateFSRS(state, 1);
    expect(result.reps).toBe(0);
    expect(result.interval).toBe(1);
  });

  it("schedules future review on rating 3 (Good)", () => {
    const result = calculateFSRS(initialFSRSState(), 3);
    expect(result.nextReview.getTime()).toBeGreaterThan(Date.now());
    expect(result.reps).toBe(1);
  });

  it("longer interval on rating 4 (Easy)", () => {
    const good = calculateFSRS(initialFSRSState(), 3);
    const easy = calculateFSRS(initialFSRSState(), 4);
    expect(easy.interval).toBeGreaterThanOrEqual(good.interval);
  });
});
