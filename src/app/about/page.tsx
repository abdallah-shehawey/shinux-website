import type { Metadata } from "next";
import { site, siteAuthor } from "@/lib/site";
import AuthorCard from "@/components/AuthorCard";

export const metadata: Metadata = { title: "About" };

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-8">
      <h1 className="mb-6 text-3xl font-bold tracking-tight">About</h1>

      <div className="mb-8">
        <AuthorCard author={siteAuthor} label="Find me online" />
      </div>

      <p className="text-lg leading-relaxed text-muted">
        Hi, I&apos;m {siteAuthor.name} — I write about Linux, the terminal, and
        whatever breaks (and gets fixed) along the way.
      </p>

      {site.socials.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
            Find me online
          </h2>
          <ul className="flex flex-wrap gap-3">
            {site.socials.map((s) => (
              <li key={s.href}>
                <a
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-ghost"
                >
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
