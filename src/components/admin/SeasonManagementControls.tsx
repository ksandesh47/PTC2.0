"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SeasonActivateButton({ seasonId, isActive }: Readonly<{ seasonId: string; isActive: boolean }>) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function activate() {
    if (isActive) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/seasons/${seasonId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: true }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to activate");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  if (isActive) {
    return (
      <span className="inline-block rounded-full bg-(--color-forest-100) text-(--color-forest-700) px-2 py-0.5 text-xs font-semibold">
        Active
      </span>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={activate}
        disabled={loading}
        className="rounded border border-(--color-border) bg-(--color-surface) px-2 py-1 text-xs font-semibold hover:bg-(--color-clay-50) disabled:opacity-60"
      >
        {loading ? "Activating…" : "Activate"}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}

export function CreateSeasonForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/seasons`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, startDate, endDate }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to create");
      }
      setOpen(false);
      setName("");
      setStartDate("");
      setEndDate("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md border border-(--color-border) bg-(--color-surface) px-3 py-2 text-sm font-semibold hover:bg-(--color-clay-50)"
      >
        + New Season
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-lg border border-(--color-border) bg-(--color-surface) p-4 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <label className="text-sm space-y-1">
          <span className="block text-xs font-semibold uppercase tracking-wider text-(--color-text-muted)">Name</span>
          <input
            type="text"
            required
            placeholder="Summer 2026"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border border-(--color-border) px-2 py-1.5"
          />
        </label>
        <label className="text-sm space-y-1">
          <span className="block text-xs font-semibold uppercase tracking-wider text-(--color-text-muted)">Start date</span>
          <input
            type="date"
            required
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full rounded-md border border-(--color-border) px-2 py-1.5"
          />
        </label>
        <label className="text-sm space-y-1">
          <span className="block text-xs font-semibold uppercase tracking-wider text-(--color-text-muted)">End date</span>
          <input
            type="date"
            required
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full rounded-md border border-(--color-border) px-2 py-1.5"
          />
        </label>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-(--color-clay-500) px-3 py-1.5 text-sm font-semibold text-white hover:bg-(--color-clay-600) disabled:opacity-60"
        >
          {loading ? "Creating…" : "Create Season"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-md border border-(--color-border) px-3 py-1.5 text-sm font-semibold hover:bg-(--color-clay-50)"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
