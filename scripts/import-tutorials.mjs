// One-off / re-runnable importer: turns the owner's study-note repos into the
// site's file-based Tutorials content (content/tutorials/<track>/*.md).
//
// It's a pure filesystem transform — each TRACK points at a source directory of
// plain Markdown notes, whether checked out locally or (for repos without a
// local copy) fetched into a scratch dir first by scripts/fetch-remote-notes.sh
// and imported the same way — this script never touches the network itself.
//
// Per source file it: derives a clean slug + order from the "NN. Name.md"
// filename, lifts the title from the first H1 and a description from the first
// paragraph, flattens ```mermaid fences to plain code (the site has no mermaid
// renderer), and writes a frontmatter'd copy. Existing output is overwritten, so
// re-running after the notes change re-syncs everything.
//
// Usage: node scripts/import-tutorials.mjs

import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const OUT_ROOT = path.join(process.cwd(), "content", "tutorials");
const AUTHOR = "abdallah-shehawey";

// Each track: where the source notes live + how the track presents itself.
// `order` sets the track's position on the /tutorials hub.
const TRACKS = [
  {
    slug: "linux-administration",
    title: "Linux Administration",
    description:
      "Linux from the ground up: the boot process, the shell, files & permissions, users & groups, processes, networking, package management, LVM and the C build process.",
    tag: "Linux",
    order: 1,
    src: "/media/Local-Disk2/DevOps/Documents/01_Linux",
  },
  {
    slug: "git-github",
    title: "Git & GitHub",
    description:
      "Version control end to end — what Git is versus GitHub, installing and configuring it, the everyday workflow, Git LFS for big files, and a scenarios cheat sheet.",
    tag: "Git",
    order: 2,
    src: "/media/Local-Disk2/DevOps/Documents/02_Git&GitHub",
  },
  {
    slug: "ansible",
    title: "Ansible",
    description:
      "Infrastructure as Code with Ansible: inventory, the config file, ad-hoc commands, playbooks, variable precedence, loops, conditionals, vault, handlers and custom roles.",
    tag: "DevOps",
    order: 3,
    src: "/media/Local-Disk2/DevOps/Documents/03_Ansible",
  },
  {
    slug: "docker",
    title: "Docker",
    description:
      "Containers from setup to internals: images and the Dockerfile, environment variables, CMD vs ENTRYPOINT, networking, storage, Compose, registries and the engine.",
    tag: "DevOps",
    order: 4,
    src: "/media/Local-Disk2/DevOps/Documents/04_Docker",
  },
  {
    slug: "raspberry-pi-interfacing",
    title: "Raspberry Pi Interfacing",
    description:
      "Getting started with the Raspberry Pi and talking to hardware — the entry point into Embedded Linux.",
    tag: "Embedded Linux",
    order: 5,
    src: "/media/Local-Disk2/Embedded_Linux/Embedded-Linux-Notes/Raspberry pi interfacing",
    optional: true,
  },
  {
    slug: "qemu",
    title: "QEMU",
    description:
      "Emulation vs. virtualization, and building minimal Linux systems in QEMU for both ARM and x86.",
    tag: "Embedded Linux",
    order: 6,
    src: "/media/Local-Disk2/Embedded_Linux/Embedded-Linux-Notes/Qemu",
    optional: true,
  },
  {
    slug: "yocto",
    title: "Yocto",
    description: "An introduction to the Yocto Project for building custom embedded Linux distributions.",
    tag: "Embedded Linux",
    order: 7,
    src: "/media/Local-Disk2/Embedded_Linux/Embedded-Linux-Notes/Yocto",
    optional: true,
  },
  {
    slug: "linux-fundamentals",
    title: "Linux Fundamentals",
    description:
      "Linux from an embedded angle: the boot process, shells, permissions, users & groups, networking, SSH, LVM, package management, MQTT, TTY/PTS and more.",
    tag: "Linux",
    order: 8,
    src: "/media/Local-Disk2/Embedded_Linux/Embedded-Linux-Notes/Linux Adminstrtion",
    optional: true,
  },
];

// "01. Docker Images.md" / "001-RHEL9-admin1.md" / "8. Git Scenarios.md" →
// { order, name } where name is the part after the leading number.
function parseNamePrefix(base) {
  const m = base.match(/^(\d+)[.\-_)\s]+(.*)$/);
  if (m) return { order: Number(m[1]), name: m[2] };
  return { order: null, name: base };
}

function slugify(input) {
  return (
    input
      .trim()
      .toLowerCase()
      .normalize("NFC")
      .replace(/&/g, " and ")
      .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "lesson"
  );
}

function stripInlineMarkdown(text) {
  return text
    .replace(/`([^`]+)`/g, "$1") // inline code
    .replace(/\*\*([^*]+)\*\*/g, "$1") // bold
    .replace(/\*([^*]+)\*/g, "$1") // italic
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // links → text
    .replace(/[_~]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// First H1 becomes the title; the first real paragraph becomes the description.
function deriveTitle(body, fallback) {
  const m = body.match(/^\s*#\s+(.+?)\s*$/m);
  return m ? stripInlineMarkdown(m[1]) : fallback;
}

// The lesson's title is lifted into frontmatter and shown as the page heading,
// so drop the source's own first H1 to avoid rendering the title twice (matches
// how the site's articles keep their bodies heading-first from H2 down).
function stripFirstH1(body) {
  const lines = body.split("\n");
  const i = lines.findIndex((l) => /^\s*#\s+\S/.test(l));
  if (i !== -1) lines.splice(i, 1);
  let out = lines.join("\n").replace(/^\s+/, "");
  // Notes often put a `---` rule right under the title; with the title gone it
  // would render as a stray divider at the very top, so drop a leading one.
  out = out.replace(/^(-{3,}|\*{3,}|_{3,})[ \t]*\r?\n+/, "");
  return out;
}

function deriveDescription(body) {
  const lines = body.split("\n");
  let sawH1 = false;
  let buf = "";
  for (const raw of lines) {
    const line = raw.trim();
    if (!sawH1) {
      if (/^#\s+/.test(line)) sawH1 = true;
      continue;
    }
    if (!line) {
      if (buf) break;
      continue;
    }
    if (/^#{1,6}\s/.test(line)) continue; // skip further headings
    if (/^([-*>|]|```|\d+\.)/.test(line)) {
      if (buf) break;
      continue; // skip list/quote/code/table starts
    }
    buf += (buf ? " " : "") + line;
    if (buf.length > 180) break;
  }
  const clean = stripInlineMarkdown(buf);
  if (!clean) return "";
  if (clean.length <= 200) return clean;
  const cut = clean.slice(0, 200);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 120 ? cut.slice(0, lastSpace) : cut).trimEnd() + "…";
}

// The Markdown pipeline has no mermaid renderer, so a ```mermaid block would
// hand an unknown language to Shiki. Relabel it as a plain code block with a
// heading so the diagram source still reads as intentional content.
function flattenMermaid(body) {
  return body.replace(/```mermaid[ \t]*\r?\n/g, "> **Diagram (Mermaid source):**\n\n```text\n");
}

function importTrack(track) {
  if (!fs.existsSync(track.src)) {
    if (track.optional) {
      console.warn(`- skip ${track.slug}: source not found (${track.src})`);
      return 0;
    }
    throw new Error(`Source directory not found: ${track.src}`);
  }

  const outDir = path.join(OUT_ROOT, track.slug);
  fs.mkdirSync(outDir, { recursive: true });

  const files = fs
    .readdirSync(track.src, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.toLowerCase().endsWith(".md"))
    .map((e) => e.name);

  let count = 0;
  let unnumbered = 900; // push files without a numeric prefix to the end

  for (const file of files) {
    const base = file.replace(/\.md$/i, "");
    const { order: parsedOrder, name } = parseNamePrefix(base);
    const order = parsedOrder ?? unnumbered++;

    const rawSource = fs.readFileSync(path.join(track.src, file), "utf8");
    // Drop any pre-existing frontmatter, then keep only the body.
    const { content } = matter(rawSource);
    const title = deriveTitle(content, name);
    const description = deriveDescription(content);
    const body = flattenMermaid(stripFirstH1(content)).trim() + "\n";
    const slug = slugify(name);

    // Pass a file object (not a raw string): matter.stringify re-parses a string
    // arg, and a body that now starts with a `---` rule would be misread as YAML.
    const output = matter.stringify({ content: body }, {
      title,
      description,
      order,
      tags: [track.tag.toLowerCase()],
      draft: false,
      author: AUTHOR,
    });

    fs.writeFileSync(path.join(outDir, `${slug}.md`), output, "utf8");
    count++;
  }

  // The track's own _index.md (meta only; empty body).
  const indexOut = matter.stringify("", {
    title: track.title,
    description: track.description,
    tag: track.tag,
    order: track.order,
  });
  fs.writeFileSync(path.join(outDir, "_index.md"), indexOut, "utf8");

  console.log(`- ${track.slug}: ${count} lessons`);
  return count;
}

fs.mkdirSync(OUT_ROOT, { recursive: true });
let total = 0;
for (const track of TRACKS) total += importTrack(track);
console.log(`\nDone. ${total} lessons across ${TRACKS.length} tracks → content/tutorials/`);
