import { describe, it, expect } from "vitest";
import { extractMentions, findActiveMention, splitMentions } from "../src/lib/mentions";

// The mention syntax, pinned. These cases are mirrored by the Postgres
// extract_mentions() check in tests/rls/mention-notifications.test.ts — the two
// parsers have to agree or a mention gets linked with nobody notified.

describe("extractMentions", () => {
  it("finds handles at the start, mid-sentence and across lines", () => {
    expect(extractMentions("@alpha hi")).toEqual(["alpha"]);
    expect(extractMentions("thanks @beta-two!")).toEqual(["beta-two"]);
    expect(extractMentions("line one\n@gamma_3 on line two")).toEqual(["gamma_3"]);
  });

  it("lowercases and de-duplicates", () => {
    expect(extractMentions("@Alpha and @ALPHA and @alpha")).toEqual(["alpha"]);
  });

  it("ignores email addresses, doubled @, and URL paths", () => {
    expect(extractMentions("mail me at someone@example.com")).toEqual([]);
    expect(extractMentions("@@notahandle")).toEqual([]);
    expect(extractMentions("https://github.com/@someone")).toEqual([]);
  });

  it("ignores handles that are too short to be a username", () => {
    expect(extractMentions("@ab")).toEqual([]);
    expect(extractMentions("@abc")).toEqual(["abc"]);
  });

  it("finds two mentions separated by a single character", () => {
    expect(extractMentions("@alpha @beta")).toEqual(["alpha", "beta"]);
    expect(extractMentions("(@alpha)(@beta)")).toEqual(["alpha", "beta"]);
  });
});

describe("findActiveMention (what opens the suggestion list)", () => {
  /** `text` with | marking the caret. */
  function at(text: string) {
    return findActiveMention(text.replace("|", ""), text.indexOf("|"));
  }

  it("opens on a bare @ and follows the query as it grows", () => {
    expect(at("@|")).toEqual({ start: 0, query: "" });
    expect(at("hey @a|")).toEqual({ start: 4, query: "a" });
    expect(at("hey @abd|")).toEqual({ start: 4, query: "abd" });
  });

  it("stays closed for an email address, a doubled @ and a URL path", () => {
    expect(at("me@host|")).toBeNull();
    expect(at("@@x|")).toBeNull();
    expect(at("x.dev/@name|")).toBeNull();
  });

  it("closes once the caret leaves the handle", () => {
    expect(at("@alpha |")).toBeNull();
    expect(at("@alpha and more|")).toBeNull();
  });

  it("reopens when the caret moves back into an earlier handle", () => {
    expect(at("@alp|ha rest")).toEqual({ start: 0, query: "alp" });
  });

  it("gives up past the maximum handle length", () => {
    expect(at(`@${"a".repeat(31)}|`)).toBeNull();
  });
});

describe("splitMentions", () => {
  const known = ["alpha", "beta"];

  it("links only handles that resolve to an account", () => {
    expect(splitMentions("hi @alpha and @nobody", known)).toEqual([
      { type: "text", value: "hi " },
      { type: "mention", handle: "alpha" },
      { type: "text", value: " and @nobody" },
    ]);
  });

  it("keeps the surrounding text intact, including the trailing run", () => {
    expect(splitMentions("@alpha @beta done", known)).toEqual([
      { type: "mention", handle: "alpha" },
      { type: "text", value: " " },
      { type: "mention", handle: "beta" },
      { type: "text", value: " done" },
    ]);
  });

  it("returns one plain segment when there is nothing to link", () => {
    expect(splitMentions("no mentions here", known)).toEqual([
      { type: "text", value: "no mentions here" },
    ]);
  });

  it("normalises the case of a handle it links", () => {
    expect(splitMentions("hey @ALPHA", known)).toEqual([
      { type: "text", value: "hey " },
      { type: "mention", handle: "alpha" },
    ]);
  });
});
