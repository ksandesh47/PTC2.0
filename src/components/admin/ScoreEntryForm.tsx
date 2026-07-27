'use client';

import { useState } from 'react';

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

interface ScoreEntryFormProps {
  matchId: string;
  initialSetCards: SetCard[];
  onSuccess?: () => void;
}

export function ScoreEntryForm({
  matchId,
  initialSetCards,
  onSuccess,
}: Readonly<ScoreEntryFormProps>) {
  const [setCards, setSetCards] = useState<SetCard[]>(initialSetCards);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSetChange = (index: number, field: 'team1Games' | 'team2Games', value: number) => {
    const nextCards = [...setCards];
    nextCards[index] = {
      ...nextCards[index],
      [field]: Math.max(0, Math.min(7, value)),
    };
    setSetCards(nextCards);
  };

  const reorderSetCards = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return;
    const reordered = [...setCards];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    setSetCards(reordered.map((card, index) => ({ ...card, setNumber: index + 1 })));
  };

  const handleSubmit = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      for (const card of setCards) {
        const response = await fetch(`/api/matches/${matchId}/sets`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pairingId: card.pairingId,
            pairing: {
              team1Player1Id: card.team1Player1Id,
              team1Player2Id: card.team1Player2Id,
              team2Player1Id: card.team2Player1Id,
              team2Player2Id: card.team2Player2Id,
            },
            sets: [{
              setNumber: card.setNumber,
              team1Games: card.team1Games,
              team2Games: card.team2Games,
            }],
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error?.message || `Failed to submit score for set ${card.setNumber}`);
        }
      }

      setSuccess(true);
      setSetCards((prev) => prev.map((card) => ({ ...card, team1Games: 0, team2Games: 0 })));
      
      // Revalidate after 1 second
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-(--color-border) bg-(--color-surface) p-4">
      {setCards.map((setCard, idx) => (
        <div
          key={`${setCard.team1Player1Id}-${setCard.team1Player2Id}-${setCard.team2Player1Id}-${setCard.team2Player2Id}`}
          className="space-y-2 rounded-lg border border-(--color-border) bg-(--color-clay-50) p-3"
          draggable
          onDragStart={() => setDraggingIndex(idx)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => {
            reorderSetCards(draggingIndex ?? -1, idx);
            setDraggingIndex(null);
          }}
          onDragEnd={() => setDraggingIndex(null)}
        >
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-(--color-text-muted)">
            <span>Set {setCard.setNumber}</span>
            <span className="rounded border border-dashed border-(--color-border) px-2 py-0.5 normal-case">Drag</span>
          </div>
          <div className="grid grid-cols-[1fr_auto_auto_1fr] gap-2 items-center">
            <div className="text-sm font-semibold">{setCard.team1Label}</div>
            <input
              type="number"
              min="0"
              max="7"
              value={setCard.team1Games}
              onChange={(e) => handleSetChange(idx, 'team1Games', Number.parseInt(e.target.value, 10) || 0)}
              className="w-14 rounded px-2 py-1.5 text-sm font-semibold border border-(--color-border) bg-white"
            />
            <input
              type="number"
              min="0"
              max="7"
              value={setCard.team2Games}
              onChange={(e) => handleSetChange(idx, 'team2Games', Number.parseInt(e.target.value, 10) || 0)}
              className="w-14 rounded px-2 py-1.5 text-sm font-semibold border border-(--color-border) bg-white text-right"
            />
            <div className="text-right text-sm font-semibold">{setCard.team2Label}</div>
          </div>
        </div>
      ))}

      {setCards.length === 0 && (
        <p className="text-sm text-(--color-text-muted)">No set cards are available for this match.</p>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}
      {success && <p className="text-xs text-green-600">Scores submitted successfully!</p>}

      <button
        type="submit"
        disabled={loading || setCards.length === 0}
        className="w-full rounded-md bg-(--color-clay-600) px-3 py-2 text-sm font-semibold text-white hover:bg-(--color-clay-700) disabled:opacity-60"
      >
        {loading ? 'Submitting...' : 'Submit Scores'}
      </button>
    </form>
  );
}
