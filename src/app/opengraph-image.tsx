import { ImageResponse } from "next/og";
import { site } from "@/lib/site";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 96,
          background: "#0d1117",
          color: "#e6edf3",
          fontFamily: "monospace",
        }}
      >
        <div style={{ display: "flex", fontSize: 32, color: "#3fb950" }}>
          $ whoami
        </div>
        <div style={{ display: "flex", marginTop: 24, fontSize: 72, fontWeight: 700 }}>
          {site.name}
        </div>
        <div style={{ display: "flex", marginTop: 20, fontSize: 32, color: "#9198a1" }}>
          {site.tagline}
        </div>
      </div>
    ),
    { ...size },
  );
}
