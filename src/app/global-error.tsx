"use client";

import Link from "next/link";
import { useEffect } from "react";

type GlobalErrorProps = {
  error: Error & { digest?: string };
  unstable_retry: () => void;
};

export default function GlobalError({ error, unstable_retry }: Readonly<GlobalErrorProps>) {
  useEffect(() => {
    console.error("Global layout render failed", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-(--color-background) text-(--color-text)">
        <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center px-4 py-12 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-(--color-clay-600)">Application issue</p>
          <h1 className="mt-2 font-display text-5xl tracking-wider text-(--color-clay-500)">WE HIT A RENDERING ERROR</h1>
          <p className="mt-3 max-w-xl text-sm text-(--color-text-muted)">
            The application shell failed to render. This usually happens when a shared dependency is unavailable.
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
              Retry App
            </button>
            <Link
              href="/"
              className="rounded-md border border-(--color-border) bg-(--color-surface) px-4 py-2 text-sm font-semibold hover:bg-(--color-clay-50)"
            >
              Return Home
            </Link>
          </div>
        </main>
      </body>
    </html>
  );
}
