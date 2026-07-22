import type { Metadata } from "next";
import Link from "next/link";

// Offline fallback page. The service worker precaches this at install time and
// serves it for navigations to pages that were never cached while the device is
// offline. Keep it fully static and dependency-free so it always renders.
export const metadata: Metadata = {
  title: "أنت غير متصل بالإنترنت",
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  return (
    <div
      dir="rtl"
      className="flex min-h-[70vh] flex-col items-center justify-center gap-6 px-6 text-center"
    >
      <div className="text-6xl" aria-hidden>
        📡
      </div>
      <h1 className="text-2xl font-bold text-fg">أنت أوفلاين دلوقتي</h1>
      <p className="max-w-md text-fg/70">
        الصفحة دي لسه متزارتش قبل كده، فمش متخزّنة على جهازك. اتصل بالإنترنت وحاول
        تفتحها تاني، وهتتحفظ تلقائيًا لأي مرة جاية حتى وأنت أوفلاين.
      </p>
      <Link
        href="/"
        className="rounded-lg bg-fg px-5 py-2.5 font-medium text-bg transition-opacity hover:opacity-90"
      >
        الرجوع للرئيسية
      </Link>
    </div>
  );
}
