"use client";

import Link from "next/link";
import { useEffect } from "react";

type AppErrorProps = {
  error: Error & { digest?: string };
  unstable_retry: () => void;
};

export default function AppError({ error, unstable_retry }: Readonly<AppErrorProps>) {
  useEffect(() => {
    console.error("Route segment render failed", error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[calc(100vh-3.5rem)] w-full max-w-3xl flex-col items-center justify-center px-4 py-12 text-center">
      <p className="text-xs font-semibold uppercase tracking-widest text-(--color-clay-600)">Temporary issue</p>
      <h1 className="mt-2 font-display text-5xl tracking-wider text-(--color-clay-500)">THIS PAGE COULD NOT LOAD</h1>
      <p className="mt-3 max-w-xl text-sm text-(--color-text-muted)">
        We hit an unexpected runtime error while preparing this page. Try again, or open another section while the data service reconnects.
      </p>
      {error.digest && (
        <p className="mt-2 text-xs text-(--color-text-muted)">Error reference: {error.digest}</p>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => unstable_retry()}
          className="rounded-md bg-(--color-accent) px-4 py-2 text-sm font-semibold text-white hover:bg-(--color-accent-hover)"
        >
          Try Again
        </button>
        <Link
          href="/"
          className="rounded-md border border-(--color-border) bg-(--color-surface) px-4 py-2 text-sm font-semibold hover:bg-(--color-clay-50)"
        >
          Go Home
        </Link>
        <Link
          href="/schedule"
          className="rounded-md border border-(--color-border) bg-(--color-surface) px-4 py-2 text-sm font-semibold hover:bg-(--color-clay-50)"
        >
          Open Schedule
        </Link>
      </div>
    </div>
  );
}
