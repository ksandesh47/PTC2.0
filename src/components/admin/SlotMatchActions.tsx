'use client';

import { useEffect, useMemo, useState } from 'react';
import { EditScoreForm } from './EditScoreForm';

type SetCard = {
  pairingId?: string;
  setNumber: number;
  team1Label: string;
  team2Label: string;
  team1Player1Id: string;
  team1Player2Id: string;
  team2Player1Id: string;
  team2Player2Id: string;
  team1Games: number;
  team2Games: number;
};

type MatchStatus = 'scheduled' | 'in_progress' | 'completed' | 'abandoned' | 'cancelled';

interface SlotMatchActionsProps {
  matchId: string;
  matchStatus: MatchStatus;
  initialSetCards: SetCard[];
  currentAbandonReason?: string | null;
  compact?: boolean;
}

const REASON_PRESETS = [
  'Rain',
  'Extreme heat warning',
  'Court unavailable',
  'Player conflict',
  'Holiday',
];

export function SlotMatchActions({
  matchId,
  matchStatus,
  initialSetCards,
  currentAbandonReason,
  compact = false,
}: Readonly<SlotMatchActionsProps>) {
  const [showEditor, setShowEditor] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [reason, setReason] = useState(currentAbandonReason ?? '');
  const [statusBusy, setStatusBusy] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  const isClosed = matchStatus === 'cancelled' || matchStatus === 'abandoned';

  const scoreLabel = useMemo(() => {
    if (matchStatus === 'completed') return '✏ Edit Score';
    if (isClosed) return 'Rescore Match';
    return '📝 Record Score';
  }, [matchStatus, isClosed]);

  useEffect(() => {
    if (!showCancelDialog) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowCancelDialog(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [showCancelDialog]);

  const patchStatus = async (payload: { status: MatchStatus; abandonReason: string | null }) => {
    setStatusBusy(true);
    setStatusError(null);
    try {
      const response = await fetch(`/api/matches/${matchId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || data.error || 'Failed to update status');
      }
      window.location.reload();
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setStatusBusy(false);
    }
  };

  const openCancelDialog = () => {
    setReason(currentAbandonReason ?? '');
    setShowCancelDialog(true);
  };

  const submitCancel = () => {
    void patchStatus({ status: 'cancelled', abandonReason: reason.trim() || null });
    setShowCancelDialog(false);
  };

  const reopenSlot = () => {
    void patchStatus({ status: 'scheduled', abandonReason: null });
  };

  let cancelButtonLabel = 'Cancel (Washout)';
  if (isClosed) cancelButtonLabel = 'Reopen Slot';
  else if (currentAbandonReason) cancelButtonLabel = 'Edit Canceled Reason';

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setShowEditor((prev) => !prev)}
          disabled={statusBusy || initialSetCards.length === 0}
          className="rounded border border-(--color-border) px-2 py-1 text-xs font-semibold hover:bg-(--color-clay-50) disabled:opacity-60"
        >
          {showEditor ? 'Close Editor' : scoreLabel}
        </button>
        <button
          type="button"
          onClick={isClosed ? reopenSlot : openCancelDialog}
          disabled={statusBusy}
          className="rounded border border-(--color-border) px-2 py-1 text-xs font-semibold hover:bg-(--color-clay-50) disabled:opacity-60"
        >
          {cancelButtonLabel}
        </button>
      </div>

      {statusError && <p className="text-xs text-red-600">{statusError}</p>}

      {showEditor && (
        <div className={compact ? 'pt-1' : 'pt-2'}>
          <EditScoreForm matchId={matchId} initialSetCards={initialSetCards} />
        </div>
      )}

      {showCancelDialog && (
        <>
          <button
            type="button"
            aria-label="Close cancel dialog"
            className="fixed inset-0 z-40 bg-black/40"
            onClick={() => setShowCancelDialog(false)}
          />
          <dialog
            open
            className="fixed inset-x-2 top-16 z-50 mx-auto w-full max-w-sm rounded-xl border border-(--color-border) bg-(--color-surface) p-0 text-inherit shadow-2xl sm:inset-x-auto"
          >
            <div className="border-b border-(--color-border) px-4 py-3">
              <p className="font-display text-lg tracking-widest text-(--color-clay-500)">
                Cancel Match
              </p>
              <p className="text-xs text-(--color-text-muted)">
                Provide a reason (weather, holiday, etc.)
              </p>
            </div>
            <div className="space-y-3 px-4 py-3 text-sm">
              <label className="block space-y-1">
                <span className="block text-xs font-semibold uppercase tracking-wider text-(--color-text-muted)">
                  Reason
                </span>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Rain, Extreme heat"
                  className="w-full rounded border border-(--color-border) bg-white px-2 py-1.5 text-sm"
                />
              </label>
              <div className="flex flex-wrap gap-1">
                {REASON_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setReason(preset)}
                    className="rounded-full border border-(--color-border) px-2 py-0.5 text-xs hover:bg-(--color-clay-50)"
                  >
                    {preset}
                  </button>
                ))}
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowCancelDialog(false)}
                  className="rounded border border-(--color-border) px-3 py-1.5 text-xs font-semibold hover:bg-(--color-clay-50)"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={submitCancel}
                  disabled={statusBusy}
                  className="rounded bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                >
                  Mark Canceled
                </button>
              </div>
            </div>
          </dialog>
        </>
      )}
    </div>
  );
}
