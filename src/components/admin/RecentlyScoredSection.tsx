'use client';

import { useState } from 'react';
import { EditScoreForm } from './EditScoreForm';
import { formatDate } from '@/lib/utils';
import { buildMatchSetRows } from '@/lib/league/display';

interface MatchSet {
  setNumber: number;
  team1Games: number;
  team2Games: number;
  version: number;
}

interface Pairing {
  id: string;
  team1Player1?: { id: string; firstName: string };
  team1Player2?: { id: string; firstName: string };
  team2Player1?: { id: string; firstName: string };
  team2Player2?: { id: string; firstName: string };
  sets: MatchSet[];
}

interface Match {
  id: string;
  weekNumber: number;
  status: string;
  slot?: { slotDate: string; label: string } | null;
  court?: string | null;
  pairings: Pairing[];
}

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

function playerPairLabel(p1?: { firstName: string }, p2?: { firstName: string }) {
  return `${p1?.firstName ?? 'TBD'} & ${p2?.firstName ?? 'TBD'}`;
}

interface RecentlyScoredSectionProps {
  matches: Match[];
  setCountByMatch: Record<string, number>;
}

function buildSetCards(match: Match): SetCard[] {
  function cardFromPairing(input: {
    pairingId?: string;
    setNumber: number;
    team1Player1: { id: string; firstName: string };
    team1Player2: { id: string; firstName: string };
    team2Player1: { id: string; firstName: string };
    team2Player2: { id: string; firstName: string };
    team1Games: number;
    team2Games: number;
  }): SetCard {
    return {
      pairingId: input.pairingId,
      setNumber: input.setNumber,
      team1Label: playerPairLabel(input.team1Player1, input.team1Player2),
      team2Label: playerPairLabel(input.team2Player1, input.team2Player2),
      team1Player1Id: input.team1Player1.id,
      team1Player2Id: input.team1Player2.id,
      team2Player1Id: input.team2Player1.id,
      team2Player2Id: input.team2Player2.id,
      team1Games: input.team1Games,
      team2Games: input.team2Games,
    };
  }

  const playerById = new Map(
    match.pairings.flatMap((pairing) => [
      pairing.team1Player1 ? [[pairing.team1Player1.id, pairing.team1Player1] as const] : [],
      pairing.team1Player2 ? [[pairing.team1Player2.id, pairing.team1Player2] as const] : [],
      pairing.team2Player1 ? [[pairing.team2Player1.id, pairing.team2Player1] as const] : [],
      pairing.team2Player2 ? [[pairing.team2Player2.id, pairing.team2Player2] as const] : [],
    ]).flat()
  );

  const pairingsForRows = match.pairings.map((pairing) => ({
    id: pairing.id,
    team1Player1Id: pairing.team1Player1?.id ?? null,
    team1Player2Id: pairing.team1Player2?.id ?? null,
    team2Player1Id: pairing.team2Player1?.id ?? null,
    team2Player2Id: pairing.team2Player2?.id ?? null,
    sets: pairing.sets,
  }));

  return buildMatchSetRows(pairingsForRows)
    .map((set) => {
      const p1 = set.team1Player1Id ? playerById.get(set.team1Player1Id) : undefined;
      const p2 = set.team1Player2Id ? playerById.get(set.team1Player2Id) : undefined;
      const p3 = set.team2Player1Id ? playerById.get(set.team2Player1Id) : undefined;
      const p4 = set.team2Player2Id ? playerById.get(set.team2Player2Id) : undefined;
      if (!p1 || !p2 || !p3 || !p4) return null;

      return cardFromPairing({
        pairingId: set.pairingId,
        setNumber: set.setNumber,
        team1Player1: p1,
        team1Player2: p2,
        team2Player1: p3,
        team2Player2: p4,
        team1Games: set.team1Games,
        team2Games: set.team2Games,
      });
    })
    .filter((card): card is SetCard => !!card);
}

export function RecentlyScoredSection({ matches, setCountByMatch }: Readonly<RecentlyScoredSectionProps>) {
  const [editingMatchId, setEditingMatchId] = useState<string | null>(null);

  if (matches.length === 0) {
    return (
      <p className="text-sm text-(--color-text-muted)">No scored matches for this week.</p>
    );
  }

  return (
    <div className="rounded-xl border border-(--color-border) bg-(--color-surface) divide-y divide-(--color-border)">
        {matches.map((m) => {
          if (m.pairings.length === 0) return null;
          const currentSets = buildSetCards(m);

          const isEditing = editingMatchId === m.id;

          return (
            <div key={m.id} className="px-4 py-3 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{m.slot?.slotDate ? formatDate(m.slot.slotDate) : 'Date pending'}</p>
                  <p className="text-xs text-(--color-text-muted)">{m.slot?.label ?? m.court ?? 'Court TBD'}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold uppercase tracking-wider text-(--color-clay-600)">{m.status.replace('_', ' ')}</p>
                  <p className="text-xs text-(--color-text-muted)">{setCountByMatch[m.id] ?? 0} sets</p>
                </div>
              </div>

              {currentSets.length > 0 && (
                <div className="space-y-2 text-xs">
                  {currentSets.map((set) => (
                    <div key={set.setNumber} className="rounded-md border border-(--color-border) bg-(--color-clay-50) px-3 py-2">
                      <p className="font-semibold uppercase tracking-wider text-(--color-text-muted)">Set {set.setNumber}</p>
                      <div className="mt-1 grid grid-cols-[1fr_auto_auto_1fr] items-center gap-2">
                        <span className="font-semibold">{set.team1Label}</span>
                        <span className="text-right font-semibold text-(--color-clay-600)">{set.team1Games}</span>
                        <span className="font-semibold text-(--color-clay-600)">{set.team2Games}</span>
                        <span className="text-right font-semibold">{set.team2Label}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {m.status === 'cancelled' && (
                <p className="text-xs font-semibold uppercase tracking-wider text-red-600">Match cancelled</p>
              )}

              {!isEditing && (
                <button
                  onClick={() => setEditingMatchId(m.id)}
                  className="text-xs font-semibold px-2 py-1 text-(--color-clay-600) hover:bg-(--color-clay-50) rounded"
                >
                  Edit Scores
                </button>
              )}

              {isEditing && (
                <div className="space-y-2 pt-2 border-t border-(--color-border)">
                  <EditScoreForm
                    matchId={m.id}
                    initialSetCards={currentSets}
                  />
                  <button
                    onClick={() => setEditingMatchId(null)}
                    className="text-xs font-semibold px-2 py-1 text-(--color-text-muted) hover:bg-(--color-clay-50) rounded"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          );
        })}
    </div>
  );
}
