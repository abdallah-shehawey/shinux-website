import { createHash } from "node:crypto";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import type { Schema } from "hast-util-sanitize";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeShiki from "@shikijs/rehype";
import rehypeStringify from "rehype-stringify";
import { visit } from "unist-util-visit";
import { toString as hastToString } from "hast-util-to-string";
import type { Root, Element } from "hast";
import type {
  Root as MdastRoot,
  Parent as MdastParent,
  Code as MdastCode,
  PhrasingContent,
  Text as MdastText,
} from "mdast";
import { detectDirection } from "./bidi";
import { MENTION_PATTERN } from "./mentions";

// ------------------------------------------------------------------------------
// Reusable Markdown → sanitized HTML pipeline.
//
// Deliberately standalone and content-source agnostic: it takes a Markdown
// STRING and returns an HTML string + a table of contents. It works the same
// for Markdown read from files (articles) or from the database later (user
// questions/answers) — see spec §12. Pass `sanitize: true` for untrusted input.
// ------------------------------------------------------------------------------

export interface TocItem {
  id: string;
  text: string;
  depth: 2 | 3;
}

export interface RenderedMarkdown {
  html: string;
  toc: TocItem[];
}

export interface RenderOptions {
  // Sanitize the HTML (strip raw HTML, scripts, iframes, …). Default: true.
  // Keep it ON for anything a user can submit.
  sanitize?: boolean;
  // Handles that resolve to a real account. Every `@handle` in this list becomes
  // a link to /u/<handle>; anything else stays literal text, so a typo'd or
  // deleted mention never renders as a link into nowhere. Callers resolve the
  // list against profiles_public — see resolveMentionHandles in questions.ts.
  mentions?: string[];
  // Treat a single newline as a line break, the way a chat box does. Markdown
  // normally folds one into a space, which is right for an article written in
  // Markdown and wrong for a question typed into a comment box — the writer
  // pressed Enter and expects a new line. On for Q&A, off for articles.
  breaks?: boolean;
}

// Sanitize schema based on the GitHub-safe default, extended just enough to keep
// heading ids (for anchors/TOC) and code language classes (for Shiki).
const sanitizeSchema: Schema = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames ?? []), "div"],
  attributes: {
    ...defaultSchema.attributes,
    "*": [...(defaultSchema.attributes?.["*"] ?? []), "id", "className"],
    code: [
      ...(defaultSchema.attributes?.code ?? []),
      ["className", /^language-./] as [string, RegExp],
    ],
    // Admonition classes set by rehypeAdmonitions() above.
    blockquote: [
      ...(defaultSchema.attributes?.blockquote ?? []),
      ["className", /^admonition(-\w+)?$/] as [string, RegExp],
    ],
    p: [...(defaultSchema.attributes?.p ?? []), ["className", "admonition-title"] as [string, string]],
    // The GitHub default gives <a> its own className rule (footnote backrefs
    // only), and a tag-specific rule wins over the "*" one above — so the two
    // classes this pipeline puts on links have to be listed here or they are
    // silently dropped from every sanitized body.
    a: [
      // The default's own className rule has to be REPLACED, not appended to:
      // the first entry for a property is the one that applies, so leaving
      // ["className", "data-footnote-backref"] in front would keep dropping
      // everything else.
      ...(defaultSchema.attributes?.a ?? []).filter(
        (attr) => !(Array.isArray(attr) && attr[0] === "className"),
      ),
      ["className", "data-footnote-backref", "mention", "heading-anchor"] as [
        string,
        ...string[],
      ],
    ],
    // Tab-group wrappers set by remarkCodeTabs() below.
    div: [
      ...(defaultSchema.attributes?.div ?? []),
      ["className", "code-tabs"] as [string, string],
      "dataTabTitles",
    ],
  },
};

// Every text block decides its own direction from its own text (detectDirection,
// see bidi.ts), so Arabic and English paragraphs coexist in one body — an English
// line inside an Arabic article renders LTR and vice versa. Resolved here rather
// than left to dir="auto" because "auto" only looks at the first strong character
// and mis-reads Arabic paragraphs opening with a Latin name or emoji.
//
// Only LEAF text blocks are stamped. Containers (ul/ol/blockquote/table) are
// deliberately left alone so bullet side, blockquote border side and padding keep
// following the PAGE direction rather than flipping per item. A <p> directly
// inside an <li> (loose lists) is skipped for the same reason: the <li> already
// carries the direction for that whole item, and a nested <p> disagreeing with it
// would put the text on the opposite side from its own bullet. <pre> is absent on
// purpose — code blocks are forced LTR in globals.css (spec §5). Runs AFTER
// rehype-sanitize so the attribute isn't stripped.
const BIDI_BLOCKS = new Set(["p", "h1", "h2", "h3", "h4", "h5", "h6", "li", "td", "th"]);

function rehypeBidiDirection() {
  return (tree: Root) => {
    visit(tree, "element", (node: Element, _index, parent) => {
      if (!BIDI_BLOCKS.has(node.tagName)) return;
      const parentTag = parent && parent.type === "element" ? parent.tagName : null;
      if (parentTag === "li") return;
      const text = hastToString(node);
      const dir = detectDirection(text);
      node.properties = { ...node.properties, dir };
    });
  };
}

// Admonitions: a blockquote whose first line is a bolded label (`> **Note:**`,
// `> **Warning:** …`) becomes a styled callout instead of a plain quote. This
// is detected on the rendered tree rather than a new Markdown syntax, so it
// applies retroactively to every `> **Label:**` blockquote already written
// across the site's content — no markdown changes, no content migration.
const ADMONITION_LABELS: Record<string, { type: string; label: string }> = {
  note: { type: "note", label: "Note" },
  notes: { type: "note", label: "Note" },
  tip: { type: "tip", label: "Tip" },
  tips: { type: "tip", label: "Tip" },
  warning: { type: "warning", label: "Warning" },
  warnings: { type: "warning", label: "Warning" },
  important: { type: "important", label: "Important" },
  danger: { type: "danger", label: "Danger" },
  caution: { type: "danger", label: "Caution" },
};

function firstElementChild(node: Element): Element | null {
  return (node.children.find((c) => c.type === "element") as Element | undefined) ?? null;
}

function rehypeAdmonitions() {
  return (tree: Root) => {
    visit(tree, "element", (node: Element) => {
      if (node.tagName !== "blockquote") return;
      const firstPara = firstElementChild(node);
      if (!firstPara || firstPara.tagName !== "p") return;
      const firstInline = firstElementChild(firstPara);
      if (!firstInline || firstInline.tagName !== "strong") return;

      const rawLabel = hastToString(firstInline).replace(/:\s*$/, "").trim().toLowerCase();
      const match = ADMONITION_LABELS[rawLabel];
      if (!match) return;

      // Drop the bold label from its paragraph, trimming any leftover ": ".
      const rest = firstPara.children.filter((c) => c !== firstInline);
      const [head, ...tail] = rest;
      if (head?.type === "text") head.value = head.value.replace(/^[:\s]+/, "");
      firstPara.children = [head, ...tail].filter(
        (c) => c && !(c.type === "text" && c.value === ""),
      ) as typeof firstPara.children;

      // If removing the label leaves its paragraph empty, drop that paragraph
      // entirely — the label becomes the callout's own title instead.
      const body =
        firstPara.children.length === 0
          ? node.children.filter((c) => c !== firstPara)
          : node.children;

      const title: Element = {
        type: "element",
        tagName: "p",
        properties: { className: ["admonition-title"] },
        children: [{ type: "text", value: match.label }],
      };

      node.properties = {
        ...node.properties,
        className: ["admonition", `admonition-${match.type}`],
      };
      node.children = [title, ...body];
    });
  };
}

// Tabbed code blocks: two or more consecutive fences whose info string
// carries tab="Title" (e.g. ```bash tab="Ubuntu") merge into one
// div.code-tabs wrapper carrying the titles. The wrapper is inert HTML —
// the CodeTabs client component turns it into the interactive tab strip, so
// without JavaScript the fences simply stack (same graceful-degradation
// approach as the copy buttons). A lone tab="…" fence stays a normal block.
const TAB_META = /(?:^|\s)tab="([^"]+)"/;

function remarkCodeTabs() {
  return (tree: MdastRoot) => {
    groupCodeTabs(tree);
  };
}

function groupCodeTabs(parent: MdastParent) {
  for (const child of parent.children) {
    if ("children" in child) groupCodeTabs(child as MdastParent);
  }

  const children = parent.children;
  for (let i = 0; i < children.length; i++) {
    const titles: string[] = [];
    let end = i;
    while (end < children.length) {
      const node = children[end];
      if (node.type !== "code") break;
      const match = ((node as MdastCode).meta ?? "").match(TAB_META);
      if (!match) break;
      titles.push(match[1]);
      end++;
    }
    if (titles.length < 2) continue;

    const group = {
      type: "codeTabGroup",
      children: children.slice(i, end),
      data: {
        hName: "div",
        hProperties: { className: ["code-tabs"], dataTabTitles: JSON.stringify(titles) },
      },
    };
    children.splice(i, titles.length, group as unknown as (typeof children)[number]);
  }
}

// Wrap every standalone highlighted code block (skipping `.code-tabs` groups,
// which render their own tab strip) in a <figure class="code-block"> with a
// header showing three dots, the language, and a copy button — server
// rendered so it's visible with no hover and no client JS on touch screens.
// CopyCodeButtons.tsx wires up the button's click handler afterwards.
//
// The language comes from the `language-*` class Shiki's own
// `addLanguageClass` option stamps on its output <code>, not from the
// pre-Shiki fence: rehypeShiki replaces the whole <pre> node wholesale
// (`parent.children[index] = fragment`), so anything set on the node before
// highlighting is discarded and can't be read after.
// @shikijs/rehype's `codeToHast()` returns a root-wrapped fragment, and its
// plugin substitutes that root in place of the original <pre> node
// (`parent.children[index] = fragment`) without unwrapping it — so every
// highlighted code block ends up nested one level deeper than it looks,
// inside a stray `root` node. Harmless for the final HTML (a root's children
// render with no wrapping tag) but it breaks anything that inspects the
// *real* parent, e.g. detecting a `.code-tabs` group below.
function rehypeUnwrapShikiRoots() {
  return (tree: Root) => {
    visit(tree, (node) => node.type === "root", (node, index, parent) => {
      if (!parent || index === undefined) return; // the tree's own root
      const nestedChildren = (node as unknown as Root).children as typeof parent.children;
      parent.children.splice(index, 1, ...nestedChildren);
      return index; // re-visit at this index instead of skipping past it
    });
  };
}

function rehypeCodeChrome() {
  return (tree: Root) => {
    visit(tree, "element", (node: Element, index, parent) => {
      // `parent` is the hast root for any top-level code block, not an
      // "element" — only .code-tabs-grouped blocks have an element parent.
      if (node.tagName !== "pre" || !parent || index === undefined) return;
      const parentCls =
        parent.type === "element" ? ((parent.properties?.className as string[]) || []) : [];
      if (parentCls.includes("code-tabs")) return; // leave tabbed blocks alone

      const code = node.children.find(
        (c) => c.type === "element" && c.tagName === "code",
      ) as Element | undefined;
      // Shiki's own hast output sets `class` (not hast's usual `className`)
      // on the <code> it generates — check both.
      const codeCls =
        ((code?.properties?.className ?? code?.properties?.class) as string[]) || [];
      const lang = codeCls.find((c) => c.startsWith("language-"))?.slice("language-".length) ?? "code";

      parent.children[index] = {
        type: "element",
        tagName: "figure",
        properties: { className: ["code-block"] },
        children: [
          {
            type: "element",
            tagName: "figcaption",
            properties: { className: ["code-block-header"] },
            children: [
              {
                type: "element",
                tagName: "span",
                properties: { className: ["code-dots"], "aria-hidden": "true" },
                children: [],
              },
              {
                type: "element",
                tagName: "span",
                properties: { className: ["code-lang"] },
                children: [{ type: "text", value: lang }],
              },
              {
                type: "element",
                tagName: "button",
                properties: { type: "button", className: ["copy-code-btn"] },
                children: [{ type: "text", value: "Copy" }],
              },
            ],
          },
          node,
        ],
      } as Element;
    });
  };
}

// @mentions → links to /u/<handle>.
//
// Runs on the MARKDOWN tree, not the HTML one, which is what keeps it honest:
// `code` fences and `inlineCode` hold their text in a `value`, not in child
// text nodes, so a shell snippet containing `user@host` is never visited at
// all. Text already inside a link is skipped explicitly so an autolinked URL
// or a `[label](url)` whose label happens to contain an @handle doesn't end up
// with a nested <a>.
//
// Only handles in `known` are linked — see RenderOptions.mentions.
function remarkMentions(known: Set<string>) {
  return (tree: MdastRoot) => {
    if (known.size === 0) return;

    visit(tree, "text", (node: MdastText, index, parent) => {
      if (!parent || index === undefined) return;
      if (parent.type === "link" || parent.type === "linkReference") return;

      const value = node.value;
      const replacement: PhrasingContent[] = [];
      let cursor = 0;

      for (const match of value.matchAll(MENTION_PATTERN)) {
        const handle = match[2].toLowerCase();
        if (!known.has(handle)) continue;

        // match.index points at the lead character (group 1), not at the "@".
        const at = match.index + match[1].length;
        if (at > cursor) replacement.push({ type: "text", value: value.slice(cursor, at) });
        replacement.push({
          type: "link",
          url: `/u/${handle}`,
          children: [{ type: "text", value: `@${handle}` }],
          data: { hProperties: { className: ["mention"] } },
        });
        cursor = at + 1 + match[2].length;
      }

      if (replacement.length === 0) return;
      if (cursor < value.length) replacement.push({ type: "text", value: value.slice(cursor) });

      parent.children.splice(index, 1, ...replacement);
      // Resume past what was just inserted — the new link nodes hold text
      // children that would otherwise be re-scanned (and skipped) one by one.
      return index + replacement.length;
    });
  };
}

// Collect h2/h3 headings (after slugs are assigned) into a table of contents.
function rehypeCollectToc(toc: TocItem[]) {
  return (tree: Root) => {
    visit(tree, "element", (node: Element) => {
      if (
        (node.tagName === "h2" || node.tagName === "h3") &&
        typeof node.properties?.id === "string"
      ) {
        toc.push({
          id: node.properties.id,
          text: hastToString(node),
          depth: node.tagName === "h2" ? 2 : 3,
        });
      }
    });
  };
}

// Every single newline becomes a hard line break, for bodies typed into a
// comment box rather than authored as Markdown. Markdown's own rule — a lone
// newline is just whitespace, two spaces at end-of-line make a break — is a
// rule nobody typing a question knows, so their line breaks silently vanished.
//
// Splits the text of each `text` node on "\n" and re-inserts `break` nodes
// between the pieces. Runs on the mdast, so it cannot touch code blocks or
// inline code: their content is not made of `text` nodes.
function remarkSoftBreaks() {
  return (tree: MdastRoot) => {
    visit(tree, "text", (node: MdastText, index, parent: MdastParent | undefined) => {
      if (!parent || index === undefined || !node.value.includes("\n")) return;

      const pieces = node.value.split("\n");
      const replacement: PhrasingContent[] = [];
      pieces.forEach((piece, i) => {
        if (i > 0) replacement.push({ type: "break" });
        if (piece) replacement.push({ type: "text", value: piece });
      });

      parent.children.splice(index, 1, ...replacement);
      // Continue past everything just inserted.
      return index + replacement.length;
    });
  };
}

// Rendered-output cache keyed by content hash: a given Markdown source is
// compiled at most once per server process (Shiki tokenization dominates the
// cost, and the question page renders the question + EVERY answer on each
// visit). The in-flight promise is stored, so concurrent renders of the same
// source share one compilation. Bounded FIFO eviction keeps memory flat.
const RENDER_CACHE_MAX = 500;
const renderCache = new Map<string, Promise<RenderedMarkdown>>();

export function renderMarkdown(
  source: string,
  options: RenderOptions = {},
): Promise<RenderedMarkdown> {
  const { sanitize = true, mentions = [], breaks = false } = options;
  // The mention set is part of the OUTPUT, so it has to be part of the key —
  // the same body renders differently once a mentioned handle starts (or stops)
  // resolving to a real account.
  const mentionKey = [...new Set(mentions)].sort().join(",");
  // `breaks` changes the output too, so it is part of the key as well.
  const key = `${sanitize ? "s" : "r"}${breaks ? "b" : ""}:${createHash("sha1")
    .update(`${mentionKey} ${source}`)
    .digest("base64")}`;

  const hit = renderCache.get(key);
  if (hit) return hit;

  const pending = renderMarkdownUncached(source, sanitize, mentions, breaks).catch((err) => {
    renderCache.delete(key); // never cache a failed compile
    throw err;
  });
  if (renderCache.size >= RENDER_CACHE_MAX) {
    const oldest = renderCache.keys().next().value;
    if (oldest !== undefined) renderCache.delete(oldest);
  }
  renderCache.set(key, pending);
  return pending;
}

async function renderMarkdownUncached(
  source: string,
  sanitize: boolean,
  mentions: string[],
  breaks: boolean,
): Promise<RenderedMarkdown> {
  const toc: TocItem[] = [];

  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkCodeTabs)
    .use(remarkMentions, new Set(mentions.map((m) => m.toLowerCase())))
    // Last of the mdast passes, so it only ever splits text the earlier
    // plugins have finished with.
    .use(breaks ? [remarkSoftBreaks] : [])
    // allowDangerousHtml stays false → raw HTML embedded in Markdown is dropped.
    .use(remarkRehype)
    // Runs before sanitize so the schema below can allow-list its classes.
    .use(rehypeAdmonitions);

  // Sanitize BEFORE highlighting so Shiki's own (trusted) inline styles survive.
  if (sanitize) {
    processor.use(rehypeSanitize, sanitizeSchema);
  }

  processor
    .use(rehypeSlug)
    .use(rehypeAutolinkHeadings, {
      behavior: "wrap",
      properties: { className: ["heading-anchor"] },
    })
    .use(rehypeCollectToc, toc)
    .use(rehypeBidiDirection)
    // Dual theme: emits --shiki-light / --shiki-dark CSS variables so the code
    // block follows the site's light/dark toggle. See globals.css.
    .use(rehypeShiki, {
      themes: { light: "catppuccin-latte", dark: "catppuccin-mocha" },
      defaultColor: false,
      addLanguageClass: true,
    })
    .use(rehypeUnwrapShikiRoots)
    .use(rehypeCodeChrome)
    .use(rehypeStringify);

  const file = await processor.process(source);
  return { html: String(file), toc };
}
