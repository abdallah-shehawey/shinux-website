"use client";

import Link from "next/link";
import { useSession } from "@/lib/use-session";

/** Shows the Admin nav item only to admins, resolved client-side (see
 *  use-session.ts — keeps the header, and with it every page, static). */
export default function AdminNavLink({ className }: { className: string }) {
  const session = useSession();
  if (!session?.isAdmin) return null;

  return (
    <Link href="/admin/questions" className={className}>
      Admin
    </Link>
  );
}
