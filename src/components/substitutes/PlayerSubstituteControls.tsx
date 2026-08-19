"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Offer = { playerId: string; playerName: string; status: string };
type SubstituteRequest = {
  id: string;
  matchId: string;
  status: string;
  requestedBy: string;
  requesterName: string;
  offers: Offer[];
};

export function PlayerSubstituteControls({
  matchId,
  viewerPlayerId,
  lineupIds,
}: Readonly<{ matchId: string; viewerPlayerId: string; lineupIds: string[] }>) {
  const router = useRouter();
  const [requests, setRequests] = useState<SubstituteRequest[]>([]);
  const [reason, setReason] = useState("");
  const [showRequest, setShowRequest] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function load() {
    const response = await fetch("/api/substitutes", { cache: "no-store" });
    if (!response.ok) return null;
    return (await response.json()) as SubstituteRequest[];
  }

  useEffect(() => {
    void load().then((nextRequests) => {
      if (nextRequests) startTransition(() => setRequests(nextRequests));
    });
  }, []);

  const request = useMemo(
    () => requests.find((candidate) => candidate.matchId === matchId && candidate.status === "open"),
    [matchId, requests]
  );
  const isAssigned = lineupIds.includes(viewerPlayerId);
  const viewerOffer = request?.offers.find((offer) => offer.playerId === viewerPlayerId);
  const canOffer = !!request && !isAssigned && (!viewerOffer || viewerOffer.status === "withdrawn");

  async function submit(action: string, playerId?: string) {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/substitutes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, matchId, requestId: request?.id, playerId, reason: reason.trim() || undefined }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Substitute action failed");
      setShowRequest(false);
      setReason("");
      const nextRequests = await load();
      if (nextRequests) setRequests(nextRequests);
      router.refresh();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Substitute action failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border-t border-(--color-border) pt-3 space-y-2">
      {error && <p className="text-xs text-red-600">{error}</p>}
      {!request && isAssigned && !showRequest && (
        <button type="button" onClick={() => setShowRequest(true)} className="rounded-md border border-(--color-border) px-3 py-1.5 text-xs font-semibold hover:bg-(--color-clay-50)">
          Request substitute
        </button>
      )}
      {showRequest && (
        <div className="flex flex-wrap items-center gap-2">
          <input value={reason} onChange={(event) => setReason(event.target.value)} maxLength={140} placeholder="Reason (optional)" className="min-w-48 flex-1 rounded-md border border-(--color-border) px-2 py-1.5 text-xs" />
          <button type="button" disabled={busy} onClick={() => void submit("request")} className="rounded-md bg-(--color-clay-500) px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">Submit</button>
          <button type="button" disabled={busy} onClick={() => setShowRequest(false)} className="text-xs text-(--color-text-muted)">Cancel</button>
        </div>
      )}
      {request && isAssigned && request.requestedBy === viewerPlayerId && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-semibold text-(--color-text-muted)">Sub request open</span>
          <button type="button" disabled={busy} onClick={() => void submit("cancel")} className="text-red-600 hover:underline">Cancel request</button>
          {request.offers.filter((offer) => offer.status === "pending").map((offer) => (
            <button key={offer.playerId} type="button" disabled={busy} onClick={() => void submit("confirm", offer.playerId)} className="rounded-md bg-(--color-clay-500) px-2 py-1 font-semibold text-white disabled:opacity-50">Select {offer.playerName}</button>
          ))}
        </div>
      )}
      {canOffer && (
        <button type="button" disabled={busy} onClick={() => void submit("offer")} className="rounded-md border border-(--color-forest-500) px-3 py-1.5 text-xs font-semibold text-(--color-forest-700) hover:bg-(--color-forest-50) disabled:opacity-50">
          Offer to substitute
        </button>
      )}
      {request && viewerOffer?.status === "pending" && !isAssigned && (
        <button type="button" disabled={busy} onClick={() => void submit("withdraw")} className="text-xs text-(--color-text-muted) hover:underline">Withdraw offer</button>
      )}
    </div>
  );
}