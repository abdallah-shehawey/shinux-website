// Shared slug helper for anything derived from user-entered titles (questions
// today; keeps Arabic titles readable in the URL instead of transliterating).
//
// Deliberately uses NFC (not NFKD): decomposing would split precomposed
// Arabic hamza letters (\u0623 \u0625 \u0624 \u0626) into a base letter plus a
// combining mark, and since combining marks aren't in the Letter/Number
// Unicode categories, they'd get replaced with a stray hyphen mid-word
// (e.g. "\u0623\u0633\u0637\u0628" -> "a-\u0633\u0637\u0628"). NFC keeps every script's
// precomposed letters intact; Latin accents (e.g. caf\u00e9) are kept as-is too,
// rather than transliterated to ASCII.
export function slugify(input: string): string {
  const base = input
    .trim()
    .toLowerCase()
    .normalize("NFC")
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return base || "question";
}
