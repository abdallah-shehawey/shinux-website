import "server-only";
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import readingTime from "reading-time";

// ------------------------------------------------------------------------------
// File-based tutorial source. Unlike articles (a flat list of standalone posts),
// tutorials are grouped into TRACKS — numbered lesson series on one topic:
//
//   content/tutorials/<track-slug>/_index.md   → the track (title/description/order)
//   content/tutorials/<track-slug>/<lesson>.md → one lesson (order via frontmatter)
//
// The whole thing is English-only, so there's none of the bilingual machinery
// the article reader carries. Lessons are ordered by their `order` frontmatter
// (written by scripts/import-tutorials.mjs from the source files' NN- prefixes),
// falling back to title order. Drafts are dev-only, excluded from prod builds.
// ------------------------------------------------------------------------------

const CONTENT_DIR = path.join(process.cwd(), "content", "tutorials");
const isProd = process.env.NODE_ENV === "production";

export interface TrackMeta {
  slug: string;
  title: string;
  description: string;
  order: number;
  /** Short label shown on the track card (e.g. "docker"). */
  tag?: string;
  lessonCount: number;
}

export interface LessonMeta {
  track: string;
  slug: string;
  order: number;
  title: string;
  description: string;
  tags: string[];
  draft: boolean;
  readingMinutes: number;
}

export interface Lesson extends LessonMeta {
  body: string;
}

function toNumber(value: unknown, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function isMarkdown(file: string): boolean {
  return file.endsWith(".md") || file.endsWith(".mdx");
}

// Every track directory that has an _index.md, with its meta (no lessons).
function readTrackDirs(): { slug: string; dir: string; data: Record<string, unknown> }[] {
  if (!fs.existsSync(CONTENT_DIR)) return [];
  return fs
    .readdirSync(CONTENT_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => {
      const dir = path.join(CONTENT_DIR, e.name);
      const indexPath = path.join(dir, "_index.md");
      if (!fs.existsSync(indexPath)) return null;
      const { data } = matter(fs.readFileSync(indexPath, "utf8"));
      return { slug: e.name, dir, data };
    })
    .filter((t): t is { slug: string; dir: string; data: Record<string, unknown> } => t !== null);
}

function readLessons(track: string, dir: string): Lesson[] {
  return fs
    .readdirSync(dir)
    .filter((f) => isMarkdown(f) && f !== "_index.md")
    .map((file) => {
      const raw = fs.readFileSync(path.join(dir, file), "utf8");
      const { data, content } = matter(raw);
      const slug = file.replace(/\.mdx?$/, "");
      return {
        track,
        slug,
        order: toNumber(data.order, 9999),
        title: typeof data.title === "string" ? data.title : slug,
        description: typeof data.description === "string" ? data.description : "",
        tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
        draft: data.draft === true,
        readingMinutes: Math.max(1, Math.round(readingTime(content).minutes)),
        body: content,
      } satisfies Lesson;
    })
    .filter((l) => !(isProd && l.draft))
    .sort((a, b) =>
      a.order !== b.order ? a.order - b.order : a.title.localeCompare(b.title),
    );
}

function stripBody(l: Lesson): LessonMeta {
  const { body: _body, ...meta } = l;
  void _body;
  return meta;
}

/** All tracks (with published lesson counts), ordered by their `order` field. */
export function getTracks(): TrackMeta[] {
  return readTrackDirs()
    .map(({ slug, dir, data }) => ({
      slug,
      title: typeof data.title === "string" ? data.title : slug,
      description: typeof data.description === "string" ? data.description : "",
      order: toNumber(data.order, 9999),
      tag: typeof data.tag === "string" ? data.tag : undefined,
      lessonCount: readLessons(slug, dir).length,
    }))
    .filter((t) => t.lessonCount > 0)
    .sort((a, b) =>
      a.order !== b.order ? a.order - b.order : a.title.localeCompare(b.title),
    );
}

/** A single track's meta + its ordered lesson metas, or null if not found. */
export function getTrack(
  slug: string,
): { meta: TrackMeta; lessons: LessonMeta[] } | null {
  const found = readTrackDirs().find((t) => t.slug === slug);
  if (!found) return null;
  const lessons = readLessons(slug, found.dir);
  if (isProd && lessons.length === 0) return null;
  return {
    meta: {
      slug,
      title: typeof found.data.title === "string" ? found.data.title : slug,
      description: typeof found.data.description === "string" ? found.data.description : "",
      order: toNumber(found.data.order, 9999),
      tag: typeof found.data.tag === "string" ? found.data.tag : undefined,
      lessonCount: lessons.length,
    },
    lessons: lessons.map(stripBody),
  };
}

/** A single lesson (with body), or null if not found / draft in production. */
export function getLesson(track: string, lesson: string): Lesson | null {
  const found = readTrackDirs().find((t) => t.slug === track);
  if (!found) return null;
  return readLessons(track, found.dir).find((l) => l.slug === lesson) ?? null;
}

/** Previous / next lesson within the same track (by lesson order). */
export function getAdjacentLessons(
  track: string,
  lesson: string,
): { prev: LessonMeta | null; next: LessonMeta | null } {
  const found = readTrackDirs().find((t) => t.slug === track);
  if (!found) return { prev: null, next: null };
  const lessons = readLessons(track, found.dir).map(stripBody);
  const i = lessons.findIndex((l) => l.slug === lesson);
  if (i === -1) return { prev: null, next: null };
  return {
    prev: i > 0 ? lessons[i - 1] : null,
    next: i < lessons.length - 1 ? lessons[i + 1] : null,
  };
}

/** All (track, lesson) slug pairs — for generateStaticParams. */
export function getAllLessonParams(): { track: string; lesson: string }[] {
  return readTrackDirs().flatMap(({ slug, dir }) =>
    readLessons(slug, dir).map((l) => ({ track: slug, lesson: l.slug })),
  );
}

// ------------------------------------------------------------------------------
// Reference repos: the owner's other repos worth linking from the Tutorials hub
// but which have no prose to convert into lessons (driver source only, or content
// that lives in PDFs). Shown as a "More resources" strip on /tutorials.
// ------------------------------------------------------------------------------
export interface ReferenceRepo {
  title: string;
  description: string;
  href: string;
  tag: string;
}

export const referenceRepos: ReferenceRepo[] = [
  {
    title: "Embedded Linux Notes",
    description:
      "The wider Embedded-Linux notes this section draws from — plus material not turned into lessons here: Yocto/BitBake, QEMU and networking references.",
    href: "https://github.com/abdallah-shehawey/Embedded-Linux-Notes",
    tag: "Embedded Linux",
  },
  {
    title: "Dotfiles & Scripts",
    description:
      "My Linux dotfiles: Neovim & Zsh configs, GNOME tweaks, themes and day-to-day scripts, with setup guides for tools like Distrobox and QuestaSim.",
    href: "https://github.com/abdallah-shehawey/dotfiles-linux",
    tag: "Linux",
  },
  {
    title: "ATMega32 Drivers",
    description:
      "AVR ATmega32 embedded-C driver library, layered MCAL/HAL — DIO, ADC, Timer, UART, SPI, I2C, plus LCD, keypad, motor and sensor modules.",
    href: "https://github.com/abdallah-shehawey/ATMega32-Drivers",
    tag: "AVR / Embedded C",
  },
  {
    title: "COTS-STM32F446xx",
    description:
      "STM32F446 (ARM Cortex-M4) bare-metal driver library — MCAL (GPIO, RCC, NVIC, SPI, SYSTICK) and HAL (LED, LCD, USART, SPI, DMA, timers) written from scratch.",
    href: "https://github.com/abdallah-shehawey/COTS-STM32F446xx",
    tag: "STM32 / ARM",
  },
  {
    title: "System Programming in Linux",
    description:
      "From-scratch C systems training: processes & signals, a custom shell, memory allocators, static/dynamic linking, OOP in C, a small RTOS and QEMU. Deep material — best explored in the repo (notes ship as PDFs).",
    href: "https://github.com/abdallah-shehawey/System-programming-in-Linux",
    tag: "Linux / Systems",
  },
];
