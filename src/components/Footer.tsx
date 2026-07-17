import { site } from "@/lib/site";

const ASCII = String.raw`   .--.
  |o_o |   linux-blog
  |:_/ |   $ echo "share & learn"`;

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-16 border-t border-border">
      <div className="mx-auto max-w-[1600px] px-4 py-8 text-sm text-muted sm:px-8 lg:px-12">
        <pre className="mb-4 select-none overflow-x-auto font-mono text-xs leading-tight text-accent/70">
          {ASCII}
        </pre>
        <p>
          © {year} {site.name} — All rights reserved. Built with Next.js &amp;
          Supabase.
        </p>
      </div>
    </footer>
  );
}
