import { describe, it, expect } from "vitest";
import { normalizeTrailUrl } from "../server/services/fetchTrailhead";

describe("normalizeTrailUrl", () => {
  it("normaliza protocolo, hostname e barra final", () => {
    const a = normalizeTrailUrl("http://Trailhead.Salesforce.com/content/learn/modules/foo/");
    const b = normalizeTrailUrl("https://trailhead.salesforce.com/content/learn/modules/foo");
    expect(a).toBe(b);
  });

  it("remove hash da URL", () => {
    const normalized = normalizeTrailUrl(
      "https://trailhead.salesforce.com/content/learn/modules/foo#section"
    );
    expect(normalized).toBe("https://trailhead.salesforce.com/content/learn/modules/foo");
  });
});
