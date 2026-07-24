import type { NextConfig } from "next";

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
