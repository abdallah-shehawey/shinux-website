"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, Link } from "@/i18n/navigation";

// Switches to the other locale while staying on the current page.
// `usePathname` from our navigation helper returns the path WITHOUT the locale
// prefix, so passing it to a locale-aware <Link> re-adds the correct prefix.
export default function LocaleSwitcher() {
  const t = useTranslations("locale");
  const locale = useLocale();
  const pathname = usePathname();
  const other = locale === "ar" ? "en" : "ar";

  return (
    <Link
      href={pathname}
      locale={other}
      className="inline-flex h-9 items-center rounded-lg border border-border px-3 font-mono text-xs text-muted transition-colors hover:text-fg hover:border-accent"
    >
      {t("switchTo")}
    </Link>
  );
}
