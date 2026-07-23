"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "@/lib/use-session";

/** Shows the Admin nav item only to admins, resolved client-side (see
 *  use-session.ts — keeps the header, and with it every page, static). */
export default function AdminNavLink({ className }: { className?: string } = {}) {
  const session = useSession();
  const pathname = usePathname();

  if (!session?.isAdmin) return null;

  const active = pathname.startsWith("/admin");

  if (className) {
    return (
      <Link href="/admin/questions" className={className}>
        Admin
      </Link>
    );
  }

  return (
    <Link
      href="/admin/questions"
      className={`relative flex h-full items-center px-3 font-medium transition-colors ${
        active ? "text-fg font-semibold" : "text-muted hover:text-fg"
      }`}
    >
      <span>Admin</span>
      {active && (
        <span
          className="absolute bottom-0 inset-x-1.5 h-[2.5px] rounded-full bg-accent shadow-[0_0_8px_var(--accent)]"
          aria-hidden="true"
        />
      )}
    </Link>
  );
}

