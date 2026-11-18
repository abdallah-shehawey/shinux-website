import { describe, it, expect } from "vitest";
import { serializeJsonLd } from "../src/lib/json-ld";

describe("serializeJsonLd", () => {
  it("cannot close the surrounding script tag", () => {
    const out = serializeJsonLd({ name: "</script><script>alert(1)</script>" });
    expect(out).not.toMatch(/<\/?script/i);
    expect(out).not.toContain("<");
  });

  it("round-trips to the same data", () => {
    const data = { name: "a < b && c > d", text: "سؤال\u2028line", n: 3 };
    expect(JSON.parse(serializeJsonLd(data))).toEqual(data);
  });
});
