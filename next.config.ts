import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/articles/install-yt-dlp",
        destination: "/tutorials/linux-desktop-setup/downloading-media-with-yt-dlp",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
