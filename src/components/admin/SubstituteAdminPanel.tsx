"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type SubstituteRequest = {
  id: string;
  matchId: string;
  status: string;
  reason: string | null;
  requesterName: string;
  slot: { label: string; date: string } | null;
  offers: Array<{ playerId: string; playerName: string; status: string }>;
};

export function SubstituteAdminPanel({
  requests,
}: Readonly<{ requests: SubstituteRequest[] }>) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(action: "confirm" | "cancel", requestId: string, playerId?: string) {
    setBusyId(requestId);
    setError(null);
    try {
      const response = await fetch("/api/substitutes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, requestId, playerId }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Substitute action failed");
      router.refresh();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Substitute action failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-3">
      {error && <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {requests.length === 0 && (
        <div className="rounded-lg border border-(--color-border) bg-(--color-surface) px-4 py-8 text-sm text-(--color-text-muted)">
          No substitute requests yet.
        </div>
      )}
      {requests.map((request) => {
        const pendingOffers = request.offers.filter((offer) => offer.status === "pending");
        return (
          <section key={request.id} className="rounded-lg border border-(--color-border) bg-(--color-surface) p-4 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-(--color-navy-600)">{request.status}</p>
                <h2 className="font-display text-xl tracking-wider">{request.requesterName} needs a substitute</h2>
                <p className="text-sm text-(--color-text-muted)">
                  {request.slot?.label ?? "Unscheduled match"}{request.slot?.date ? ` · ${request.slot.date}` : ""}
                </p>
                {request.reason && <p className="mt-1 text-sm">Reason: {request.reason}</p>}
              </div>
              {request.status === "open" && (
                <button
                  type="button"
                  disabled={busyId === request.id}
                  onClick={() => void run("cancel", request.id)}
                  className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                >
                  Cancel request
                </button>
              )}
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-(--color-text-muted)">Offers</p>
              {request.offers.length === 0 && <p className="text-sm text-(--color-text-muted)">No offers yet.</p>}
              {request.offers.map((offer) => (
                <div key={offer.playerId} className="flex items-center justify-between gap-3 border-t border-(--color-border) pt-2 text-sm">
                  <span>{offer.playerName}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs uppercase text-(--color-text-muted)">{offer.status}</span>
                    {request.status === "open" && offer.status === "pending" && (
                      <button
                        type="button"
                        disabled={busyId === request.id}
                        onClick={() => void run("confirm", request.id, offer.playerId)}
                        className="rounded-md bg-(--color-navy-500) px-3 py-1.5 text-xs font-semibold text-white hover:bg-(--color-navy-600) disabled:opacity-50"
                      >
                        Select
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {request.status === "open" && pendingOffers.length === 0 && request.offers.length > 0 && (
                <p className="text-xs text-(--color-text-muted)">All offers have been withdrawn or resolved.</p>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
