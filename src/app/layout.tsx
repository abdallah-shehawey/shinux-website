import type { Metadata, Viewport } from "next";
import { Inter, IBM_Plex_Sans_Arabic, JetBrains_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { site } from "@/lib/site";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { ThemeScript } from "@/components/ThemeScript";
import ServiceWorkerCleanup from "@/components/ServiceWorkerCleanup";
import ScrollMemory from "@/components/ScrollMemory";
import PrefetchOnIntent from "@/components/PrefetchOnIntent";
import NavigationPendingProvider from "@/components/NavigationPending";
import NavigationSkeleton from "@/components/NavigationSkeleton";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// Still loaded even though the site UI is English-only: individual articles
// can be written in Arabic and are rendered with this font (see ArticlePage).
const ibmPlexArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-ibm-plex-arabic",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

// A single, non-media theme-color: the browser/PWA chrome must follow the theme
// the user picked in the app (the `theme` cookie), not the OS preference — with
// media-keyed values a light page on a dark phone kept a black status bar.
// ThemeScript rewrites this before first paint and ThemeToggle keeps it in sync;
// the value here is the dark default that <html className="dark"> ships with.
export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: "#010409",
};

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? site.url;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: site.name, template: `%s · ${site.name}` },
  description: site.tagline,
  // Installability only. The manifest is what lets someone add the site to
  // their home screen and open it in its own window — it caches nothing and
  // costs nothing to serve. Offline support is a separate thing entirely, and
  // this site does not have it: there is no service worker (see
  // ServiceWorkerCleanup.tsx), so an installed copy is the site in a window
  // and needs the network exactly like the browser tab does.
  manifest: "/manifest.webmanifest",
  // Link previews (WhatsApp / Telegram / Facebook / X …). The image itself is
  // the static card at src/app/opengraph-image.png (file convention — Next
  // fills in og:image and twitter:image, their size/type, and the alt text from
  // opengraph-image.alt.txt). These fields make the title/description/card
  // render correctly across platforms; twitter.card = "summary_large_image"
  // forces X to show the big preview, not a tiny one.
  openGraph: {
    type: "website",
    siteName: site.name,
    title: { default: site.name, template: `%s · ${site.name}` },
    description: site.tagline,
    url: siteUrl,
    // The shell (and the card) are English — <html lang> says the same.
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: { default: site.name, template: `%s · ${site.name}` },
    description: site.tagline,
  },
  // iOS has no install prompt: Safari's "Add to Home Screen" reads these,
  // which is what opens the installed copy without browser chrome.
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: site.name,
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180" }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // No theme class on <html>: React rewrites this className on the first client
  // render, which silently reverted the visitor's choice (the home page went
  // back to dark ~13ms after DOMContentLoaded). The theme is a `data-theme`
  // attribute owned by ThemeScript instead — dark is the default and needs no
  // attribute. See ThemeScript for the full story.
  return (
    <html
      lang="en"
      dir="ltr"
      suppressHydrationWarning
      className={`${inter.variable} ${ibmPlexArabic.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <head>
        <ThemeScript />
      </head>
      <body className="flex min-h-full flex-col bg-bg text-fg">
        {/* Wraps the header too, not just the page: while a navigation is in
            flight the nav highlights the tab being opened at the same moment
            its skeleton appears, so the two never disagree. `children` stays a
            server-rendered slot throughout — NavigationSkeleton only chooses
            between it and the destination's loading.tsx. */}
        <NavigationPendingProvider>
          <Header />
          <main className="flex-1">
            <NavigationSkeleton>{children}</NavigationSkeleton>
          </main>
          <Footer />
        </NavigationPendingProvider>
        <ScrollMemory />
        {/* Warms a route the moment the reader points at it. The card grids
            have viewport prefetch switched off, so without this every card
            click paid a full round trip staring at a skeleton. */}
        <PrefetchOnIntent />
        <ServiceWorkerCleanup />
        <Analytics />
      </body>
    </html>
  );
}
