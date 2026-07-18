"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex w-full flex-col items-center gap-4 px-4 py-32 text-center sm:px-8 lg:px-12">
      <p className="font-mono text-4xl text-accent">500</p>
      <p className="font-mono text-sm text-muted">$ run page &rarr; unexpected error</p>
      <div className="mt-2 flex gap-3">
        <button type="button" onClick={reset} className="btn-primary">
          Try again
        </button>
        <Link href="/" className="btn-ghost">
          cd ~/
        </Link>
      </div>
    </div>
  );
}
