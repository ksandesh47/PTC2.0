"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Preview = { assignments: Array<{ slotId: string; label: string; playerNames: string[] }>; skipped: Array<{ label: string; reason: string }> };

export function AutoAssignWeekButton({ weekNumber }: Readonly<{ weekNumber: number }>) {
  const router = useRouter();
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function openPreview() {
    setBusy(true); setError(null);
    try {
      const response = await fetch("/api/slots/auto-assign-week", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ weekNumber }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to preview assignments");
      setPreview(data);
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to preview assignments"); }
    finally { setBusy(false); }
  }

  async function confirm() {
    if (!preview) return;
    setBusy(true); setError(null);
    try {
      const response = await fetch("/api/slots/auto-assign-week", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ weekNumber, confirm: true }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to assign the week");
      setPreview(null); router.refresh();
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to assign the week"); }
    finally { setBusy(false); }
  }

  return <div className="space-y-2">
    <button type="button" onClick={() => void openPreview()} disabled={busy} className="rounded-md bg-(--color-navy-900) px-4 py-2 text-sm font-semibold text-white hover:bg-(--color-navy-800) disabled:opacity-50">{busy ? "Preparing…" : "⚡ Preview Auto-Assign Week"}</button>
    {error && <p className="text-xs text-red-600">{error}</p>}
    {preview && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"><div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl bg-(--color-surface) p-5 shadow-2xl"><div className="flex items-center justify-between"><h2 className="font-display text-xl tracking-wider">PREVIEW WEEK {weekNumber}</h2><button type="button" onClick={() => setPreview(null)} aria-label="Close preview">✕</button></div><div className="mt-4 space-y-2">{preview.assignments.map((assignment) => <div key={assignment.slotId} className="rounded border border-(--color-border) p-3 text-sm"><p className="font-semibold">{assignment.label}</p><p className="mt-1 text-(--color-text-muted)">{assignment.playerNames.join(" · ")}</p></div>)}</div>{preview.skipped.length > 0 && <div className="mt-4 rounded border border-yellow-200 bg-yellow-50 p-3 text-xs text-yellow-800"><p className="font-semibold">Skipped slots</p>{preview.skipped.map((item) => <p key={`${item.label}:${item.reason}`}>{item.label}: {item.reason}</p>)}</div>}<div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setPreview(null)} className="rounded border border-(--color-border) px-3 py-2 text-sm">Cancel</button><button type="button" onClick={() => void confirm()} disabled={busy || preview.assignments.length === 0} className="rounded bg-(--color-navy-900) px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">Confirm Assignments</button></div></div></div>}
  </div>;
}