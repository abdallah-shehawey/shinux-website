import { defineRouting } from "next-intl/routing";

// English is the default (served at the root path, e.g. "/articles").
// Arabic is served under an "/ar" prefix (e.g. "/ar/articles"), rendered RTL.
export const routing = defineRouting({
  locales: ["en", "ar"],
  defaultLocale: "en",
  localePrefix: "as-needed",
  // The root ("/") always serves the default (English) instead of auto-redirecting
  // based on the browser's Accept-Language. Arabic stays available at "/ar" and
  // via the language switcher.
  localeDetection: false,
});

export type Locale = (typeof routing.locales)[number];
