import Link from "next/link";
import { FaGlobe } from "react-icons/fa";
import { FaArrowRight } from "react-icons/fa6";
import { site } from "@/lib/site";

// Cross-link to my portfolio. Built from the same design tokens as the rest of
// the site (bg-card / border / btn-primary), so it adapts to light & dark and
// reads as a native section rather than a bolted-on banner.
export default function PortfolioCta() {
  return (
    <section className="mt-12 rounded-xl border border-accent/60 bg-card p-6 sm:p-8">
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <FaGlobe className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden />
          <div>
            <h2 className="text-lg font-semibold text-fg">
              See the work behind the writing
            </h2>
            <p className="mt-1 text-sm text-muted">
              Curious about the projects behind these posts? My portfolio is a
              closer look at what I build — my embedded &amp; firmware projects,
              experience, and skills, all in one place.
            </p>
          </div>
        </div>
        <Link
          href={site.portfolioUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary inline-flex shrink-0 items-center gap-1.5"
        >
          View My Portfolio
          <FaArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>
    </section>
  );
}
