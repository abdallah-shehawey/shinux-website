import { ImageResponse } from "next/og";
import { getQuestionBySlug } from "@/lib/questions";
import { site } from "@/lib/site";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const question = await getQuestionBySlug(slug);
  const title = question?.title ?? site.name;
  const isRtl = question?.locale === "ar";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 96,
          background: "#0d1117",
          color: "#e6edf3",
          fontFamily: "monospace",
        }}
      >
        <div style={{ display: "flex", fontSize: 28, color: "#3fb950" }}>
          $ {site.name} / questions
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 56,
            fontWeight: 700,
            lineHeight: 1.3,
            direction: isRtl ? "rtl" : "ltr",
            textAlign: isRtl ? "right" : "left",
          }}
        >
          {title}
        </div>
        <div style={{ display: "flex", fontSize: 28, color: "#9198a1" }}>
          {question ? `${question.answer_count} answers` : site.url.replace(/^https?:\/\//, "")}
        </div>
      </div>
    ),
    { ...size },
  );
}
