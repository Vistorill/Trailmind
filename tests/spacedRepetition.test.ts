import { describe, it, expect } from "vitest";
import { calculateNextReview } from "../server/lib/spacedRepetition";

describe("SM-2 spaced repetition", () => {
  it("resets interval on failure (quality < 3)", () => {
    const result = calculateNextReview(1, 10, 2.5, 5);
    expect(result.interval).toBe(1);
    expect(result.reviewCount).toBe(0);
  });

  it("sets interval to 1 on first success", () => {
    const result = calculateNextReview(4, 0, 2.5, 0);
    expect(result.interval).toBe(1);
    expect(result.reviewCount).toBe(1);
  });

  it("sets interval to 6 on second success", () => {
    const result = calculateNextReview(4, 1, 2.5, 1);
    expect(result.interval).toBe(6);
    expect(result.reviewCount).toBe(2);
  });

  it("schedules nextReview in the future", () => {
    const result = calculateNextReview(5, 6, 2.5, 2);
    expect(result.nextReview.getTime()).toBeGreaterThan(Date.now());
  });
});
