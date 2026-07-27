'use client';

import { useEffect, useMemo, useState } from 'react';

type AvailabilityStatus = 'available' | 'maybe' | 'unavailable' | null;

type PlayerOption = {
  id: string;
  name: string;
  gamesPlayed: number;
  availability: AvailabilityStatus;
};

type Assignment = {
  team1Player1Id: string;
  team1Player2Id: string;
  team2Player1Id: string;
  team2Player2Id: string;
};

interface AssignSlotPlayersFormProps {
  slotId: string;
  slotHeader?: string;
  matchId?: string;
  players: PlayerOption[];
  initialAssignment?: Assignment | null;
  disabled?: boolean;
  disabledMessage?: string;
}

function availabilityLabel(status: AvailabilityStatus): string {
  if (status === 'available') return 'Available';
  if (status === 'maybe') return 'Maybe';
  if (status === 'unavailable') return 'Unavailable';
  return 'Not marked available';
}

function availabilitySortKey(status: AvailabilityStatus): number {
  if (status === 'available') return 0;
  if (status === 'maybe') return 1;
  if (status === 'unavailable') return 3;
  return 2;
}

function availabilityChip(status: AvailabilityStatus): string {
  if (status === 'available') return 'bg-(--color-forest-100) text-(--color-forest-700)';
  if (status === 'maybe') return 'bg-yellow-100 text-yellow-800';
  if (status === 'unavailable') return 'bg-red-100 text-red-700';
  return 'bg-(--color-navy-100) text-(--color-text-muted)';
}

export function AssignSlotPlayersForm({
  slotId,
  slotHeader,
  matchId,
  players,
  initialAssignment,
  disabled = false,
  disabledMessage,
}: Readonly<AssignSlotPlayersFormProps>) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>(() =>
    initialAssignment
      ? [
          initialAssignment.team1Player1Id,
          initialAssignment.team1Player2Id,
          initialAssignment.team2Player1Id,
          initialAssignment.team2Player2Id,
        ].filter(Boolean)
      : []
  );

  const sortedPlayers = useMemo(() => {
    return [...players].sort((a, b) => {
      const diff = availabilitySortKey(a.availability) - availabilitySortKey(b.availability);
      if (diff !== 0) return diff;
      return a.name.localeCompare(b.name);
    });
  }, [players]);

  const remaining = 4 - selected.length;
  const canSubmit = !disabled && !loading && selected.length === 4;

  useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  const toggleSelection = (playerId: string) => {
    setSelected((prev) => {
      if (prev.includes(playerId)) return prev.filter((id) => id !== playerId);
      if (prev.length >= 4) return prev;
      return [...prev, playerId];
    });
  };

  let submitLabel = 'Save Assignment';
  if (loading) submitLabel = 'Saving...';
  else if (remaining > 0) submitLabel = `Select ${remaining} more player${remaining === 1 ? '' : 's'}`;

  const submit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    try {
      const payload: Assignment = {
        team1Player1Id: selected[0],
        team1Player2Id: selected[1],
        team2Player1Id: selected[2],
        team2Player2Id: selected[3],
      };
      const response = await fetch(`/api/slots/${slotId}/assignment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || data.error || 'Failed to assign players');
      }
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const toggleLabel = matchId ? '⟳ Re-assign' : '✎ Assign Players';

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={disabled}
        className="rounded border border-(--color-border) px-2 py-1 text-xs font-semibold hover:bg-(--color-navy-50) disabled:opacity-60"
      >
        {toggleLabel}
      </button>

      {disabled && disabledMessage && (
        <p className="mt-1 text-xs text-(--color-text-muted)">{disabledMessage}</p>
      )}

      {open && (
        <>
          <button
            type="button"
            aria-label="Close player picker"
            className="fixed inset-0 z-40 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <dialog
            open
            className="fixed inset-x-2 top-8 z-50 mx-auto flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-xl border border-(--color-border) bg-(--color-surface) p-0 text-inherit shadow-2xl sm:inset-x-auto"
          >
            <div className="flex items-start justify-between gap-3 border-b border-(--color-border) px-4 py-3">
              <div>
                <p className="font-display text-lg tracking-widest text-(--color-navy-500)">Pick Players</p>
                <p className="text-xs text-(--color-text-muted)">{slotHeader ?? 'Select exactly 4'}</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded px-2 py-1 text-sm hover:bg-(--color-navy-50)"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="border-b border-(--color-border) bg-(--color-navy-50) px-4 py-2 text-xs">
              {selected.length === 0 ? (
                <p className="text-(--color-text-muted)">No players selected yet</p>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {selected.map((id, index) => {
                    const player = players.find((p) => p.id === id);
                    return (
                      <span
                        key={id}
                        className="inline-flex items-center gap-1 rounded-full bg-(--color-navy-600) px-2 py-0.5 text-white"
                      >
                        <span className="font-mono">{index + 1}</span>
                        <span>{player?.name ?? '?'}</span>
                        <button
                          type="button"
                          onClick={() => toggleSelection(id)}
                          className="ml-1 rounded hover:opacity-80"
                          aria-label={`Remove ${player?.name ?? 'player'}`}
                        >
                          ✕
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto">
              {sortedPlayers.map((player) => {
                const isSelected = selected.includes(player.id);
                const disableBtn = !isSelected && selected.length >= 4;
                return (
                  <button
                    key={player.id}
                    type="button"
                    disabled={disableBtn}
                    onClick={() => toggleSelection(player.id)}
                    className={`flex w-full items-center justify-between gap-3 border-b border-(--color-border) px-4 py-2.5 text-left text-sm transition-colors last:border-b-0 disabled:cursor-not-allowed disabled:opacity-40 ${
                      isSelected ? 'bg-(--color-navy-50)' : 'hover:bg-(--color-navy-50)'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                          isSelected
                            ? 'bg-(--color-navy-600) text-white'
                            : 'border border-(--color-border) text-(--color-text-muted)'
                        }`}
                      >
                        {isSelected ? selected.indexOf(player.id) + 1 : '+'}
                      </span>
                      <div>
                        <p className="font-semibold">{player.name}</p>
                        <p className="text-xs text-(--color-text-muted)">
                          <span className={`mr-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${availabilityChip(player.availability)}`}>
                            {availabilityLabel(player.availability)}
                          </span>
                          · {player.gamesPlayed} played
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="space-y-2 border-t border-(--color-border) px-4 py-3">
              {error && <p className="text-xs text-red-600">{error}</p>}
              <button
                type="button"
                onClick={submit}
                disabled={!canSubmit}
                className="w-full rounded bg-(--color-navy-600) px-3 py-2 text-sm font-semibold text-white hover:bg-(--color-navy-700) disabled:opacity-60"
              >
                {submitLabel}
              </button>
            </div>
          </dialog>
        </>
      )}
    </>
  );
}
