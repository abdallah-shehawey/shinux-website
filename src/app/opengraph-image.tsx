import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { site } from "@/lib/site";

/* The link-preview card for the site root — what WhatsApp / Telegram /
 * LinkedIn / X show when the homepage URL is shared. It reuses the site's own
 * visual language: the TerminalHero window from the home page, the GitHub-dark
 * palette from globals.css, and the chevron mark from public/icon.svg.
 *
 * Satori (the renderer inside next/og) is not a browser: any element with more
 * than one child needs an explicit `display: flex`, `gap` is unreliable, and
 * only the fonts passed below exist — plain `fontFamily: "monospace"` silently
 * fell back to the bundled Noto Sans, which is why this card used to look like
 * a default template. Keep that in mind before editing. */

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Pre-subsetted (latin-only) copies of two of the three families the site
// loads in layout.tsx. Read from disk rather than fetched from Google so a
// build never depends on the network — this route is prerendered, so the read
// happens at build time (next.config.ts also traces the files, in case the
// route ever renders on demand).
const FONT_DIR = path.join(process.cwd(), "src", "lib", "og-fonts");
const loadFont = (file: string) => readFile(path.join(FONT_DIR, file));

const C = {
  page: "#010409",
  card: "#0d1117",
  bar: "#161b22",
  border: "#21262d",
  fg: "#f0f6fc",
  muted: "#8b949e",
  dim: "#6e7681",
  accent: "#3fb950",
};

// The site icon (public/icon.svg), inlined so the card carries the real mark.
const LOGO = `data:image/svg+xml;utf8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">' +
    '<rect x="8" y="8" width="496" height="496" rx="112" fill="#161b22" stroke="#30363d" stroke-width="4"/>' +
    '<polyline points="182,176 268,256 182,336" fill="none" stroke="#3fb950" stroke-width="38" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<rect x="286" y="306" width="150" height="36" rx="18" fill="#3fb950"/>' +
    "</svg>",
)}`;

// Faint blueprint grid behind the window — an SVG pattern rather than a
// repeating gradient, which Satori does not render reliably.
const GRID = `data:image/svg+xml;utf8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">' +
    '<defs><pattern id="g" width="48" height="48" patternUnits="userSpaceOnUse">' +
    '<path d="M48 0H0V48" fill="none" stroke="#ffffff" stroke-opacity="0.07" stroke-width="1"/>' +
    "</pattern></defs>" +
    '<rect width="1200" height="630" fill="url(#g)"/></svg>',
)}`;

const HEADLINE = "Notes from below the OS";
const BLURB =
  "Embedded Linux, RTOS internals, and everything on the way from firmware to the kernel — write-ups, hands-on tutorials, and a Q&A archive.";
const SECTIONS = ["Articles", "Tutorials", "Q&A"];

export default async function Image() {
  const [monoRegular, monoBold, sans] = await Promise.all([
    loadFont("JetBrainsMono-Regular.ttf"),
    loadFont("JetBrainsMono-Bold.ttf"),
    loadFont("Inter-Regular.ttf"),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          padding: 44,
          background: C.page,
          fontFamily: "JetBrains Mono",
        }}
      >
        {/* Backdrop: grid + two soft glows (terminal green, GitHub blue). */}
        <img
          src={GRID}
          width={1200}
          height={630}
          style={{ position: "absolute", top: 0, left: 0 }}
          alt=""
        />
        <div
          style={{
            position: "absolute",
            top: -280,
            left: -200,
            width: 900,
            height: 720,
            background:
              "radial-gradient(circle at center, rgba(63,185,80,0.30) 0%, rgba(63,185,80,0.08) 45%, rgba(1,4,9,0) 70%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -340,
            right: -240,
            width: 860,
            height: 680,
            background:
              "radial-gradient(circle at center, rgba(56,139,253,0.22) 0%, rgba(56,139,253,0.05) 45%, rgba(1,4,9,0) 70%)",
          }}
        />

        {/* Terminal window */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            borderRadius: 22,
            border: `1px solid ${C.border}`,
            background: C.card,
            boxShadow: "0 30px 70px rgba(0,0,0,0.55)",
          }}
        >
          {/* Title bar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              height: 64,
              padding: "0 26px",
              borderBottom: `1px solid ${C.border}`,
              background: C.bar,
              borderTopLeftRadius: 22,
              borderTopRightRadius: 22,
            }}
          >
            <div style={{ display: "flex", alignItems: "center" }}>
              {["#ff5f56", "#ffbd2e", "#27c93f"].map((color) => (
                <div
                  key={color}
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: 7,
                    background: color,
                    marginRight: 9,
                  }}
                />
              ))}
            </div>
            <div
              style={{
                display: "flex",
                flex: 1,
                justifyContent: "center",
                fontSize: 21,
                color: C.dim,
              }}
            >
              {site.name} — bash
            </div>
            <div style={{ display: "flex", fontSize: 21, color: C.dim }}>
              ~/
            </div>
          </div>

          {/* Window body */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              padding: "36px 44px 32px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", fontSize: 27 }}>
              <span style={{ color: C.accent, marginRight: 14 }}>$</span>
              <span style={{ color: "#c9d1d9" }}>whoami</span>
              {/* Cursor, frozen mid-blink. */}
              <div
                style={{
                  width: 14,
                  height: 28,
                  marginLeft: 10,
                  background: C.accent,
                  borderRadius: 2,
                }}
              />
            </div>

            <div
              style={{
                display: "flex",
                marginTop: 22,
                fontSize: 76,
                fontWeight: 700,
                letterSpacing: -2,
                color: C.fg,
              }}
            >
              {site.name}
            </div>

            <div
              style={{
                display: "flex",
                marginTop: 14,
                fontSize: 30,
                color: C.accent,
              }}
            >
              {HEADLINE}
            </div>

            <div
              style={{
                display: "flex",
                marginTop: 18,
                maxWidth: 940,
                fontFamily: "Inter",
                fontSize: 25,
                lineHeight: 1.45,
                color: C.muted,
              }}
            >
              {BLURB}
            </div>

            <div style={{ display: "flex", flex: 1 }} />

            {/* What the site is made of */}
            <div
              style={{ display: "flex", alignItems: "center", marginTop: 30 }}
            >
              {SECTIONS.map((label) => (
                <div
                  key={label}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    marginRight: 12,
                    padding: "9px 18px",
                    borderRadius: 999,
                    border: "1px solid rgba(63,185,80,0.35)",
                    background: "rgba(63,185,80,0.10)",
                    fontSize: 21,
                    color: C.accent,
                  }}
                >
                  {label}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer strip under the window */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginTop: 24,
            height: 44,
          }}
        >
          <img src={LOGO} width={44} height={44} alt="" />
          <div
            style={{ display: "flex", marginLeft: 16, fontSize: 24, color: C.fg }}
          >
            {site.url.replace(/^https?:\/\//, "")}
          </div>
          <div style={{ display: "flex", flex: 1 }} />
          <div
            style={{
              display: "flex",
              fontFamily: "Inter",
              fontSize: 22,
              color: C.dim,
            }}
          >
            {site.author.name} · Embedded Software Engineer
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: "JetBrains Mono",
          data: monoRegular,
          weight: 400,
          style: "normal",
        },
        {
          name: "JetBrains Mono",
          data: monoBold,
          weight: 700,
          style: "normal",
        },
        { name: "Inter", data: sans, weight: 400, style: "normal" },
      ],
    },
  );
}
