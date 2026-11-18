import { describe, it, expect } from "vitest";
import { safeNext } from "../src/lib/safe-next";

describe("safeNext", () => {
  it("keeps same-origin paths, with query and hash", () => {
    expect(safeNext("/")).toBe("/");
    expect(safeNext("/ask")).toBe("/ask");
    expect(safeNext("/welcome?next=%2Fme#top")).toBe("/welcome?next=%2Fme#top");
  });

  it("falls back when missing", () => {
    expect(safeNext(undefined)).toBe("/");
    expect(safeNext(null)).toBe("/");
    expect(safeNext("")).toBe("/");
    expect(safeNext(undefined, "/me")).toBe("/me");
  });

  it("rejects anything that can leave the origin", () => {
    for (const evil of [
      "https://evil.com",
      "//evil.com",
      "/\\evil.com",
      "/\t/evil.com",
      "/\n/evil.com",
      ".evil.com",
      "@evil.com",
      "evil.com",
      "javascript:alert(1)",
    ]) {
      expect(safeNext(evil), evil).toBe("/");
    }
  });
});
