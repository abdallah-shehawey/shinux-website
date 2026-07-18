// Mirrors what HTML dir="auto" does — the first strong directional character
// decides — for places where we set a CONTAINER's direction server-side
// (answer bodies have no locale field, unlike questions/articles). The
// container's dir drives the side of list bullets, blockquote borders and
// padding; the per-block dir="auto" stamped by src/lib/markdown.ts then
// handles any opposite-direction paragraph inside it.

// Hebrew, Arabic, Syriac, Thaana + Arabic presentation forms.
const RTL_CHAR = /[֐-ࣿיִ-﷽ﹰ-ﻼ]/;
// Latin (incl. extended), Greek, Cyrillic.
const LTR_CHAR = /[A-Za-zÀ-ɏͰ-ӿ]/;

export function detectDirection(text: string): "rtl" | "ltr" {
  for (const ch of text) {
    if (RTL_CHAR.test(ch)) return "rtl";
    if (LTR_CHAR.test(ch)) return "ltr";
  }
  return "ltr";
}
