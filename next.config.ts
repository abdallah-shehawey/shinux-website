import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    staleTimes: {
      dynamic: 300,
      static: 300,
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
