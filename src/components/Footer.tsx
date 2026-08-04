import { site } from "@/lib/site";
import OfflineDownload from "@/components/OfflineDownload";

// The face is a static SVG of baked vector outlines rather than <pre> text, so
// a browser-forced font can no longer break its alignment. The wording beside
// it is ordinary text — it just reflows, it has nothing to line up with.

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-16 border-t border-border">
      <div className="mx-auto w-full px-4 py-8 text-sm text-muted sm:px-8 lg:px-12">
        <div
          dir="ltr"
          translate="no"
          className="notranslate mb-4 flex select-none items-center gap-3 text-start"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/ascii-face.svg"
            alt="ASCII-style penguin face"
            width={40}
            height={39}
            className="h-[50px] w-auto opacity-70"
          />
          <div className="font-mono text-xs leading-relaxed text-accent/70">
            <div>{site.name}</div>
            <div>{`$ echo "share & learn"`}</div>
          </div>
        </div>
        <p>{`© ${year} ${site.name} — All rights reserved.`}</p>

        {/* Renders nothing until a service worker controls the page, so it
            never appears in dev or on a browser without SW support. */}
        <OfflineDownload />
      </div>
    </footer>
  );
}
