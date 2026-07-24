// Picks a text direction server-side, for two callers:
//   - CONTAINER direction where there's no locale field to go on (answer
//     bodies, unlike questions/articles). This drives the side of list
//     bullets, blockquote borders and padding.
//   - every markdown leaf block, stamped by src/lib/markdown.ts.
//
// Close to HTML's dir="auto" but not identical — see the rule below.

// Hebrew, Arabic, Syriac, Thaana + Arabic presentation forms.
const RTL_CHAR = /[֐-ࣿיִ-﷽ﹰ-ﻼ]/;
// Latin (incl. extended), Greek, Cyrillic.
const LTR_CHAR = /[A-Za-zÀ-ɏͰ-ӿ]/;

// The first strong character decides (same as dir="auto"), EXCEPT when the
// opposite direction dominates the text by more than 2:1 — then the leading
// character was just a label and the majority wins.
//
// Both halves are load-bearing:
//   - dominance override: "🎮 **Nobara** *(للعلم: اللي عامل Nobara هو نفسه...)*"
//     leads with a Latin product name but is an Arabic sentence — RTL.
//   - first-strong default: "الـ Package Manager اللي بتنزل منه البرامج (زي apt
//     في Ubuntu، أو dnf في Fedora)" is an Arabic sentence that happens to carry
//     more Latin *characters* than Arabic ones, because technical terms are long
//     and Arabic words are short. A plain character-majority vote flips it to
//     LTR; requiring 2:1 dominance keeps it RTL.
const DOMINANCE_RATIO = 2;

export function detectDirection(text: string): "rtl" | "ltr" {
  let rtlCount = 0;
  let ltrCount = 0;
  let firstStrong: "rtl" | "ltr" | null = null;

  for (const ch of text) {
    if (RTL_CHAR.test(ch)) {
      rtlCount++;
      firstStrong ??= "rtl";
    } else if (LTR_CHAR.test(ch)) {
      ltrCount++;
      firstStrong ??= "ltr";
    }
  }

  if (firstStrong === null) return "ltr";
  if (firstStrong === "ltr" && rtlCount > ltrCount * DOMINANCE_RATIO) return "rtl";
  if (firstStrong === "rtl" && ltrCount > rtlCount * DOMINANCE_RATIO) return "ltr";
  return firstStrong;
}

