import Link from "next/link";

export default function NotFoundPage() {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-3.5rem)] w-full max-w-3xl flex-col items-center justify-center px-4 py-12 text-center">
      <p className="text-xs font-semibold uppercase tracking-widest text-[--color-clay-600]">404</p>
      <h1 className="mt-2 font-display text-5xl tracking-wider text-[--color-clay-500]">PAGE NOT FOUND</h1>
      <p className="mt-3 max-w-xl text-sm text-[--color-text-muted]">
        The page you requested does not exist or may have moved.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="rounded-md bg-[--color-accent] px-4 py-2 text-sm font-semibold text-white hover:bg-[--color-accent-hover]"
        >
          Home
        </Link>
        <Link
          href="/schedule"
          className="rounded-md border border-[--color-border] bg-[--color-surface] px-4 py-2 text-sm font-semibold hover:bg-[--color-clay-50]"
        >
          Schedule
        </Link>
      </div>
    </div>
  );
}
