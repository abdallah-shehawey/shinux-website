import { Link } from "@/i18n/navigation";

// Minimal locale-aware 404. A fuller error/404 experience lands in Phase 6.
export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 px-4 py-32 text-center">
      <p className="font-mono text-4xl text-accent">404</p>
      <p className="font-mono text-sm text-muted">
        $ cat page &rarr; No such file or directory
      </p>
      <Link href="/" className="btn-ghost mt-2">
        cd ~/
      </Link>
    </div>
  );
}
