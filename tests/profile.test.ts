import { describe, it, expect } from "vitest";
import { profileUpdateSchema } from "../server/routers/profile";

describe("profile.update validation", () => {
  it("rejects empty name when provided", () => {
    const result = profileUpdateSchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });

  it("accepts valid name", () => {
    const result = profileUpdateSchema.safeParse({ name: "Marcos" });
    expect(result.success).toBe(true);
  });

  it("validates dailyStudyMinutes range", () => {
    expect(profileUpdateSchema.safeParse({ dailyStudyMinutes: 4 }).success).toBe(false);
    expect(profileUpdateSchema.safeParse({ dailyStudyMinutes: 30 }).success).toBe(true);
    expect(profileUpdateSchema.safeParse({ dailyStudyMinutes: 500 }).success).toBe(false);
  });
});
