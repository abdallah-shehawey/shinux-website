import type { NextConfig } from "next";
import { site } from "./src/lib/site";

// Where the site actually lives now. Same precedence as everywhere else, so a
// preview deployment pointed elsewhere redirects to itself, not to production.
const canonicalOrigin = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? site.url).origin;

// Domains the site used to answer on. They stay pointed at the Vercel project
// so old links keep resolving — this is what turns them into a one-hop move
// instead of a second, competing copy of the site.
const LEGACY_HOSTS = ["shehaweyblog.vercel.app"].filter(
  (host) => host !== new URL(canonicalOrigin).host,
);

const nextConfig: NextConfig = {
  experimental: {
    // How long the CLIENT router may reuse an already-fetched route before a
    // click has to go back to the network. The tabs are statically prerendered
    // and their content changes a few times a week, so 30 minutes of reuse
    // makes every revisit within a session instant at zero network cost —
    // which matters far more here than shaving minutes off how quickly an edit
    // shows up mid-session (a reload, or the service worker's update banner,
    // still picks it up immediately).
    //
    // `dynamic` stays short: /me and /admin are per-user and must not be served
    // from a stale client cache just because they were visited recently.
    staleTimes: {
      dynamic: 30,
      static: 1800,
    },
  },
  async redirects() {
    return [
      // ── the shehaweyblog -> shinux move ──────────────────────────────────
      // The old domain is still an alias on the Vercel project and answers
      // 200, so without this every previously shared link serves a full second
      // copy of the site: duplicate content for crawlers, and the retired name
      // sitting in the address bar. A permanent redirect retires it without
      // breaking anything already shared — removing the alias outright would
      // instead 404 every one of those links.
      //
      // This belongs here rather than in src/proxy.ts: that matcher is
      // deliberately narrow (see the note at the bottom of it) and widening it
      // to cover every path would cost a function invocation on every request.
      // Redirects are resolved before any of that runs.
      //
      // Listed first so an old link to a moved tutorial lands on the new host
      // and then follows the path redirects below.
      ...LEGACY_HOSTS.map((host) => ({
        source: "/:path*",
        has: [{ type: "host" as const, value: host }],
        destination: `${canonicalOrigin}/:path*`,
        permanent: true,
      })),
      {
        source: "/tutorials/linux-desktop-setup/automating-system-updates",
        destination: "/tutorials/scripts/automating-system-updates",
        permanent: true,
      },
      {
        source: "/tutorials/linux-desktop-setup/google-meet-cli-launcher",
        destination: "/tutorials/scripts/google-meet-cli-launcher",
        permanent: true,
      },
      {
        source: "/tutorials/linux-desktop-setup/vidtime-a-tiny-cli-for-video-duration",
        destination: "/tutorials/scripts/vidtime-a-tiny-cli-for-video-duration",
        permanent: true,
      },
      {
        source: "/tutorials/linux-desktop-setup/smart-file-renaming-and-writing-custom-man-pages",
        destination: "/tutorials/scripts/smart-file-renaming-and-padnum",
        permanent: true,
      },
      {
        source: "/tutorials/linux-desktop-setup/automating-meeting-downloads-and-cloud-uploads",
        destination: "/tutorials/scripts/automating-meeting-downloads-and-cloud-uploads",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
