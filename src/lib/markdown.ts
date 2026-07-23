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
import type { Root as MdastRoot, Parent as MdastParent, Code as MdastCode } from "mdast";

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
    // Tab-group wrappers set by remarkCodeTabs() below.
    div: [
      ...(defaultSchema.attributes?.div ?? []),
      ["className", "code-tabs"] as [string, string],
      "dataTabTitles",
    ],
  },
};

import { detectDirection } from "./bidi";

// Every text block decides its own direction based on character counts (dir="rtl" or "ltr"),
// so Arabic and English paragraphs coexist cleanly in one body, and Arabic paragraphs starting
// with English names or emojis (e.g. "🎮 Nobara") aren't misclassified as LTR.
const BIDI_BLOCKS = new Set(["p", "h1", "h2", "h3", "h4", "h5", "h6", "li", "td", "th"]);

function rehypeBidiAuto() {
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
  const { sanitize = true } = options;
  const key = `${sanitize ? "s" : "r"}:${createHash("sha1").update(source).digest("base64")}`;

  const hit = renderCache.get(key);
  if (hit) return hit;

  const pending = renderMarkdownUncached(source, sanitize).catch((err) => {
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
): Promise<RenderedMarkdown> {
  const toc: TocItem[] = [];

  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkCodeTabs)
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
    .use(rehypeBidiAuto)
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
