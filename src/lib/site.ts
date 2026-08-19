// Central site / author configuration.
// The article "author card" is a generic component that receives an Author as
// props (spec §12), so nothing here assumes a single hard-coded author forever.

export interface SocialLink {
  label: string;
  /** A direct link. Omit and use `links` instead when a platform has more than one account. */
  href?: string;
  /** Multiple accounts on the same platform (e.g. two Facebook profiles) — rendered as a small expandable group. */
  links?: { label: string; href: string }[];
}

export interface Author {
  name: string;
  username: string;
  /** Optional avatar URL. If missing, the AuthorCard shows an initials glyph. */
  avatar?: string;
}

export const site = {
  // Lowercase everywhere — it is a shell name, and the header renders it as a
  // prompt ("$ shinux"). "sh" (the shell) + "linux" is the whole story, and the
  // logo is that same lockup: sh_
  name: "shinux",
  /** Short slogan — the site's own words, matching the home page heading. */
  tagline: "Notes from below the OS",
  /**
   * The long form, used as the meta description on every page that does not
   * write its own. Search results cut off around 155 characters, so this is
   * written to survive the truncation.
   */
  description:
    "Embedded Linux, RTOS internals, and everything else on the way from firmware to the kernel — write-ups, hands-on tutorials, and a Q&A archive.",
  /** Production URL (env-overridable elsewhere via NEXT_PUBLIC_SITE_URL). */
  url: "https://shinux.vercel.app",
  repoUrl: "https://github.com/abdallah-shehawey/shinux-website",
  /** My portfolio — cross-linked from the header nav and the About page CTA. */
  portfolioUrl: "https://abdallahshehawey.vercel.app/",
  author: {
    name: "Abdallah Shehawey",
    username: "abdallah-shehawey",
  } satisfies Author,
  // Kept in sync with linkora-rouge.vercel.app/abdallahshehawey (his
  // link-in-bio page) and abdallahshehawey.vercel.app (his portfolio) —
  // update both places by hand if a link there changes.
  socials: [
    {
      label: "Facebook",
      links: [
        { label: "Abdallah Shehawey", href: "https://www.facebook.com/share/1D5FvK4NSg/" },
        { label: "Facebook (For Fun)", href: "https://www.facebook.com/share/1JgfzcvfHQ/" },
      ],
    },
    { label: "WhatsApp", href: "https://wa.me/201501899476" },
    { label: "LinkedIn", href: "https://www.linkedin.com/in/abdallah-shehawey" },
    { label: "GitHub", href: "https://github.com/abdallah-shehawey" },
    { label: "Portfolio", href: "https://abdallahshehawey.vercel.app/" },
    { label: "Email", href: "mailto:shehawey9@gmail.com" },
    { label: "X (Twitter)", href: "https://x.com/abdallashehawey" },
    { label: "Instagram", href: "https://www.instagram.com/abdallah_shehawey" },
    { label: "Telegram", href: "https://t.me/abdullah_shehawey" },
  ] as SocialLink[],
} as const;

export const siteAuthor: Author = site.author;

/**
 * The site's link-preview card (src/app/opengraph-image.png).
 *
 * The root layout picks this up on its own through Next's file convention, but
 * that only covers routes which do not declare an `openGraph` of their own —
 * a page that returns one from generateMetadata REPLACES the parent's, image
 * included. Articles, lessons and questions all do, so they have to name the
 * card explicitly or their links unfurl with no picture at all.
 *
 * Resolved against `metadataBase` (set in the root layout), so the relative URL
 * still comes out absolute in the tag.
 */
export const ogCard = {
  url: "/opengraph-image.png",
  width: 1200,
  height: 630,
  // Mirrors src/app/opengraph-image.alt.txt.
  alt: 'A terminal window on a dark grid background running "$ cat /etc/shinux-release", answering with the shinux wordmark and "Notes from below the OS" over a short blurb about the site, with pills for its Articles, Tutorials and Q&A sections.',
};
