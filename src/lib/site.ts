// Central site / author configuration.
// The article "author card" is a generic component that receives an Author as
// props (spec §12), so nothing here assumes a single hard-coded author forever.

export interface SocialLink {
  label: string;
  href: string;
}

export interface Author {
  name: string;
  username: string;
  /** Optional avatar URL. If missing, the AuthorCard shows an initials glyph. */
  avatar?: string;
}

export const site = {
  /** Production URL (env-overridable elsewhere via NEXT_PUBLIC_SITE_URL). */
  url: "https://shehaweyblog.vercel.app",
  repoUrl: "https://github.com/abdallah-shehawey/Linux-Blog",
  author: {
    name: "Abdallah Shehawey",
    username: "abdallah-shehawey",
  } satisfies Author,
  socials: [
    { label: "GitHub", href: "https://github.com/abdallah-shehawey" },
  ] as SocialLink[],
} as const;

export const siteAuthor: Author = site.author;
