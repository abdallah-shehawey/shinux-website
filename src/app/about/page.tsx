import type { Metadata } from "next";
import { site, siteAuthor } from "@/lib/site";
import { getAuthorProfile } from "@/lib/authors";
import AuthorCard from "@/components/AuthorCard";
import PortfolioCta from "@/components/PortfolioCta";
import { getSocialIcon } from "@/lib/social-icons";

export const metadata: Metadata = { title: "About" };

export default async function AboutPage() {
  // Live name/avatar from the site's own account (settable via /me), same
  // source as the article bylines — falls back to the hardcoded siteAuthor
  // if migration 0006 isn't applied yet or the lookup fails.
  const author = (await getAuthorProfile(siteAuthor.username).catch(() => null)) ?? siteAuthor;

  return (
    <div className="mx-auto w-full px-4 pt-6 pb-12 sm:px-8 lg:px-12">
      <h1 className="mb-6 text-3xl font-bold tracking-tight">About</h1>

      <div className="mb-8">
        <AuthorCard author={author} label="Find me online" />
      </div>

      <div className="flex flex-col gap-4 text-lg leading-relaxed text-muted">
        <p>
          Hi, I&apos;m {author.name} — an Electronics &amp; Communication Engineering
          graduate from Al-Azhar University (Cairo, 2026) who fell in love with what
          happens below the operating system. I write firmware in C/C++, build device
          drivers from the datasheet up, and care about deterministic, real-time code.
        </p>
        <p>
          My focus is automotive-grade embedded software: RTOS-based architectures,
          communication protocols (CAN, LIN, UART, SPI, I2C), and the AUTOSAR layered
          architecture. My graduation project was a V2X collision-avoidance vehicle, and
          these days I&apos;m digging deeper into Embedded Linux — kernel fundamentals,
          Yocto, and Buildroot. This blog is where I write that part down.
        </p>
        <p>
          When I&apos;m not shipping firmware, I teach — I&apos;ve trained 200+ students in
          C and embedded systems through AZEX and Google Developer Student Club at my
          university — and I sharpen my skills in coding competitions and hackathons.
        </p>
        <p>
          In my free time I do a lot of vibe coding — I love picking up new things,
          which is really what pulled me into it in the first place. I&apos;m
          constantly building something different every few days, just to learn
          and explore.
        </p>
      </div>

      {site.socials.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
            Find me online
          </h2>
          <ul className="flex flex-wrap gap-3">
            {site.socials.map((s) => {
              const Icon = getSocialIcon(s.label);
              return s.links ? (
                <li key={s.label}>
                  <details className="group relative">
                    <summary className="btn-ghost inline-flex cursor-pointer select-none list-none items-center gap-1.5">
                      <Icon className="h-4 w-4" aria-hidden />
                      {s.label} <span className="ms-1 text-muted">&darr;</span>
                    </summary>
                    <ul className="absolute start-0 top-full z-10 mt-1 flex w-56 max-w-[calc(100vw-2rem)] flex-col gap-1 rounded-lg border border-border bg-card p-1.5 shadow-lg">
                      {s.links.map((l) => (
                        <li key={l.href}>
                          <a
                            href={l.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block rounded-md px-3 py-1.5 text-sm text-fg hover:bg-bg"
                          >
                            {l.label}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </details>
                </li>
              ) : (
                <li key={s.href}>
                  <a
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-ghost inline-flex items-center gap-1.5"
                  >
                    <Icon className="h-4 w-4" aria-hidden />
                    {s.label}
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <PortfolioCta />
    </div>
  );
}
