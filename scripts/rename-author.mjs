// Repoints authored content at a renamed account.
//
// Changing a username in /me only moves the DB row: profiles.username is a
// single unique column, so the old handle is released the moment you save and
// /u/<old> starts 404ing. Content, though, credits its author by handle in
// frontmatter (`author: <username>`), and that lives in git — the running site
// cannot rewrite it. Until you run this, every article and lesson you wrote
// keeps a byline linking to a handle you no longer own, your public profile
// counts them as zero, and whoever claims the old handle next inherits them.
//
// Usage:
//   node scripts/rename-author.mjs <old-handle> <new-handle> [--dry]
//   npm run rename:author -- <old-handle> <new-handle>
//
// Then commit and redeploy — the bylines are baked into statically generated
// pages at build time.

import fs from "node:fs";
import path from "node:path";

const [oldHandle, newHandle, ...rest] = process.argv.slice(2);
const dryRun = rest.includes("--dry");
const HANDLE_PATTERN = /^[a-z0-9_-]{3,30}$/;

if (!oldHandle || !newHandle) {
  console.error("Usage: node scripts/rename-author.mjs <old-handle> <new-handle> [--dry]");
  process.exit(1);
}
for (const handle of [oldHandle, newHandle]) {
  if (!HANDLE_PATTERN.test(handle)) {
    console.error(`Not a valid handle: "${handle}" (3-30 chars of a-z, 0-9, _ or -)`);
    process.exit(1);
  }
}
if (oldHandle === newHandle) {
  console.error("Both handles are the same — nothing to do.");
  process.exit(1);
}

const CONTENT_DIR = path.join(process.cwd(), "content");
const SITE_CONFIG = path.join(process.cwd(), "src", "lib", "site.ts");

/** Every .md/.mdx file under content/, at any depth (articles are flat, tutorials nest by track). */
function markdownFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return markdownFiles(full);
    return /\.mdx?$/.test(entry.name) ? [full] : [];
  });
}

/**
 * Rewrites the `author:` line inside the frontmatter block only.
 *
 * Deliberately not a gray-matter round trip: reserializing would reflow every
 * other field (the folded `description: >-` blocks, the Arabic quoting) and
 * bury a one-line change in a whole-file diff. Returns null when nothing
 * matched.
 */
function rewriteAuthor(source) {
  if (!source.startsWith("---\n")) return null;
  const end = source.indexOf("\n---", 4);
  if (end === -1) return null;

  const frontmatter = source.slice(4, end);
  const pattern = new RegExp(`^(author:\\s*)(['"]?)${oldHandle}\\2\\s*$`, "m");
  if (!pattern.test(frontmatter)) return null;

  const updated = frontmatter.replace(pattern, `$1${newHandle}`);
  return `---\n${updated}${source.slice(end)}`;
}

const files = markdownFiles(CONTENT_DIR);
const changed = [];

for (const file of files) {
  const source = fs.readFileSync(file, "utf8");
  const updated = rewriteAuthor(source);
  if (updated === null) continue;
  changed.push(path.relative(process.cwd(), file));
  if (!dryRun) fs.writeFileSync(file, updated);
}

// The homepage author card and the article fallback byline read this handle
// straight out of the config (src/lib/site.ts), so the owner's own rename has
// to land here too.
let siteConfigChanged = false;
if (fs.existsSync(SITE_CONFIG)) {
  const source = fs.readFileSync(SITE_CONFIG, "utf8");
  const pattern = new RegExp(`(username:\\s*)"${oldHandle}"`);
  if (pattern.test(source)) {
    siteConfigChanged = true;
    if (!dryRun) fs.writeFileSync(SITE_CONFIG, source.replace(pattern, `$1"${newHandle}"`));
  }
}

const verb = dryRun ? "Would update" : "Updated";
console.log(`${verb} ${changed.length} content file(s) crediting @${oldHandle}:`);
for (const file of changed) console.log(`  ${file}`);
if (siteConfigChanged) console.log(`  ${path.relative(process.cwd(), SITE_CONFIG)} (site.author)`);
if (changed.length === 0 && !siteConfigChanged) {
  console.log("  (nothing referenced that handle)");
} else if (!dryRun) {
  console.log(`\nCommit and redeploy so the bylines rebuild against @${newHandle}.`);
}
