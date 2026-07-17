import { useTranslations } from "next-intl";

const ASCII = String.raw`   .--.
  |o_o |   linux-blog
  |:_/ |   $ echo "share & learn"`;

export default function Footer() {
  const t = useTranslations("footer");
  const tSite = useTranslations("site");
  const year = new Date().getFullYear();

  return (
    <footer className="mt-16 border-t border-border">
      <div className="mx-auto max-w-5xl px-4 py-8 text-sm text-muted">
        <pre
          dir="ltr"
          className="mb-4 select-none overflow-x-auto font-mono text-xs leading-tight text-accent/70"
        >
          {ASCII}
        </pre>
        <p>
          © {year} {tSite("name")} — {t("rights")}. {t("builtWith")}.
        </p>
      </div>
    </footer>
  );
}
