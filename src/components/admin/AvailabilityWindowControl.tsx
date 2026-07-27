"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/utils";
import { updateAvailabilityWindow } from "./availability-actions";

export function AvailabilityWindowControl({
  seasonId,
  startDate,
  endDate,
}: Readonly<{
  seasonId: string;
  startDate: string;
  endDate: string;
}>) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [customStart, setCustomStart] = useState(startDate);
  const [customEnd, setCustomEnd] = useState(endDate);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await updateAvailabilityWindow(seasonId, customStart, customEnd);
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setLoading(false);
    }
  }

  async function extendDays(days: number) {
    setLoading(true);
    setError(null);

    try {
      const end = new Date(endDate);
      end.setDate(end.getDate() + days);
      const newEnd = end.toISOString().slice(0, 10);

      await updateAvailabilityWindow(seasonId, startDate, newEnd);
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to extend");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-lg border border-(--color-border) bg-(--color-surface) p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl tracking-wider">
            AVAILABILITY WINDOW
          </h2>
          <p className="text-xs text-(--color-text-muted) mt-1">
            {formatDate(startDate)} – {formatDate(endDate)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className={`rounded-md px-3 py-2 text-sm font-semibold transition-colors ${
            open
              ? "bg-(--color-navy-500) text-white hover:bg-(--color-navy-600)"
              : "border border-(--color-border) bg-(--color-surface) hover:bg-(--color-navy-50)"
          }`}
        >
          {open ? "✓ Done" : "Edit Window"}
        </button>
      </div>

      {open && (
        <>
          <form onSubmit={submit} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-widest text-(--color-text-muted)">
                  From
                </span>
                <input
                  type="date"
                  required
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="w-full rounded-md border border-(--color-border) px-3 py-2 text-sm"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-widest text-(--color-text-muted)">
                  To
                </span>
                <input
                  type="date"
                  required
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="w-full rounded-md border border-(--color-border) px-3 py-2 text-sm"
                />
              </label>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={loading}
                className="rounded-md bg-(--color-navy-500) px-3 py-2 text-sm font-semibold text-white hover:bg-(--color-navy-600) disabled:opacity-60"
              >
                {loading ? "Saving…" : "Save Custom Window"}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md border border-(--color-border) px-3 py-2 text-sm font-semibold hover:bg-(--color-navy-50)"
              >
                Cancel
              </button>
            </div>
          </form>

          <div className="border-t border-(--color-border) pt-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-(--color-text-muted) mb-2">
              Quick Extend
            </p>
            <div className="flex flex-wrap gap-2">
              {[7, 14, 30].map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => extendDays(days)}
                  disabled={loading}
                  className="rounded-md border border-(--color-border) px-3 py-1.5 text-xs font-semibold hover:bg-(--color-navy-50) disabled:opacity-50"
                >
                  +{days} days
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
