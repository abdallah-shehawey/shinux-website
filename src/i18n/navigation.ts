import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

// Locale-aware navigation helpers. Always import Link/useRouter/usePathname
// from here (not from "next/link" / "next/navigation") so locale prefixes are
// handled automatically.
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
