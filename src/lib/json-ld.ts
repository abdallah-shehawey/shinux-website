/**
 * Serialises structured data for a `<script type="application/ld+json">` tag.
 *
 * JSON.stringify alone is not safe inside a script element: a question title or
 * body containing `</script><script>…` would close the tag and run as markup
 * (stored XSS on /questions/[slug]). Escaping `<`, `>` and `&` as \u-sequences
 * keeps the JSON identical once parsed while making it inert as HTML.
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}
