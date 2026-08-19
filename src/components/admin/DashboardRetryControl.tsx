"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function DashboardRetryControl() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      onClick={() => {
        startTransition(() => {
          router.refresh();
        });
      }}
      disabled={isPending}
      className="rounded-md border border-yellow-300 bg-white px-2.5 py-1 text-xs font-semibold text-yellow-900 hover:bg-yellow-100 disabled:cursor-not-allowed disabled:opacity-70"
    >
      {isPending ? "Retrying..." : "Retry"}
    </button>
  );
}
