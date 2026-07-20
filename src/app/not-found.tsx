import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-[1600px] flex-col items-center gap-4 px-4 pt-16 pb-20 text-center sm:px-8 lg:px-12">
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
