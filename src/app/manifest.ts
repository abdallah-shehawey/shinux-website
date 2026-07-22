import type { MetadataRoute } from "next";

// Web App Manifest — makes the site installable as a standalone app (PWA).
// Served at /manifest.webmanifest.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "shehaweyblog",
    short_name: "shehaweyblog",
    description:
      "A personal Linux blog with articles and a Q&A archive. مدونة شخصية عن لينكس: مقالات، أوامر، وأرشيف أسئلة وأجوبة.",
    lang: "en",
    dir: "ltr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#0d1117",
    theme_color: "#0d1117",
    categories: ["education", "productivity", "books"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
  };
}
