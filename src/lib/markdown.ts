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
  attributes: {
    ...defaultSchema.attributes,
    "*": [...(defaultSchema.attributes?.["*"] ?? []), "id", "className"],
    code: [
      ...(defaultSchema.attributes?.code ?? []),
      ["className", /^language-./] as [string, RegExp],
    ],
  },
};

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

export async function renderMarkdown(
  source: string,
  options: RenderOptions = {},
): Promise<RenderedMarkdown> {
  const { sanitize = true } = options;
  const toc: TocItem[] = [];

  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    // allowDangerousHtml stays false → raw HTML embedded in Markdown is dropped.
    .use(remarkRehype);

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
    // Dual theme: emits --shiki-light / --shiki-dark CSS variables so the code
    // block follows the site's light/dark toggle. See globals.css.
    .use(rehypeShiki, {
      themes: { light: "catppuccin-latte", dark: "catppuccin-mocha" },
      defaultColor: false,
    })
    .use(rehypeStringify);

  const file = await processor.process(source);
  return { html: String(file), toc };
}
