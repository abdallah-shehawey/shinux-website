import { describe, it, expect } from "vitest";
import { renderMarkdown } from "../src/lib/markdown";

// Where the mention rule meets the Markdown pipeline: only real handles become
// links, and code is never touched.

describe("renderMarkdown mentions", () => {
  it("links a known handle and leaves an unknown one as text", async () => {
    const { html } = await renderMarkdown("hi @alpha and @nobody", { mentions: ["alpha"] });
    expect(html).toContain('href="/u/alpha"');
    expect(html).toContain("@alpha");
    expect(html).not.toContain('href="/u/nobody"');
    expect(html).toContain("@nobody");
  });

  it("does nothing at all when no handles are passed", async () => {
    const plain = await renderMarkdown("hi @alpha");
    expect(plain.html).not.toContain("href=");
    // Articles and tutorials render with no mention list — byte-identical to
    // what they produced before mentions existed.
    expect(plain.html).toContain("@alpha");
  });

  it("leaves inline code and fenced code alone", async () => {
    const { html } = await renderMarkdown("`ssh @alpha` then\n\n```sh\nscp x @alpha:/tmp\n```", {
      mentions: ["alpha"],
    });
    expect(html).not.toContain('href="/u/alpha"');
  });

  it("does not nest a link inside a link", async () => {
    const { html } = await renderMarkdown("[ask @alpha](/questions)", { mentions: ["alpha"] });
    expect(html).toContain('href="/questions"');
    expect(html).not.toContain('href="/u/alpha"');
  });

  it("keeps the mention class through sanitization", async () => {
    const { html } = await renderMarkdown("@alpha", { mentions: ["alpha"] });
    expect(html).toContain('class="mention"');
  });

  it("does not treat an email address as a mention", async () => {
    const { html } = await renderMarkdown("write to me\\@alpha.com", { mentions: ["alpha"] });
    expect(html).not.toContain('href="/u/alpha"');
  });
});
