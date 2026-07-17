import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

// Locale-aware 404. A fuller error/404 experience (custom illustration, etc.)
// lands in Phase 6.
export default async function NotFound() {
  const t = await getTranslations("notFound");

  return (
    <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 px-4 py-32 text-center">
      <p className="font-mono text-4xl text-accent">{t("title")}</p>
      <p className="font-mono text-sm text-muted">$ {t("message")}</p>
      <Link href="/" className="btn-ghost mt-2">
        {t("home")}
      </Link>
    </div>
  );
}
