"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AutoAssignButton({
  slotId,
  availableCount,
  disabled,
}: Readonly<{ slotId: string; availableCount: number; disabled?: boolean }>) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/slots/${slotId}/auto-assign`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(typeof data.error === "string" ? data.error : "Failed to auto-assign");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  const insufficient = availableCount < 4;
  const isDisabled = disabled || loading || insufficient;

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={run}
        disabled={isDisabled}
        title={insufficient ? `Only ${availableCount} available (need 4)` : "Pick 4 available players with fewest games"}
        className="w-full rounded-md border border-[--color-border] bg-[--color-surface] px-3 py-1.5 text-xs font-semibold hover:bg-[--color-clay-50] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Auto-assigning…" : "⚡ Auto-Assign"}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
