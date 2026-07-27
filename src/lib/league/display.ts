import { getStandingsLabel, palominoLeagueRules } from "./rules";

export type StandingsSnapshotRow = {
  rank: number | null;
  firstName: string;
  lastName: string;
  matchesPlayed: number;
  matchesWon: number;
  setsWon: number;
  setsLost: number;
  gamesWon: number;
  gamesLost: number;
  points: number;
  computedAt: Date;
};

export function projectStandings(rows: StandingsSnapshotRow[]) {
  return rows.map((row, index) => {
    const countedMatches = Math.min(
      row.matchesPlayed,
      palominoLeagueRules.standings.topMatchCount
    );

    return {
      ...row,
      displayRank: row.rank ?? index + 1,
      playerName: `${row.firstName} ${row.lastName}`,
      standingsTotal: row.points,
      countedMatches,
      averageScore:
        countedMatches > 0 ? Number((row.points / countedMatches).toFixed(1)) : 0,
      breakdownLabel: getStandingsLabel(),
    };
  });
}

export function getLatestVersionSets<T extends { version: number; setNumber: number }>(
  sets: T[]
) {
  const latestVersion = Math.max(...sets.map((set) => set.version), 0);
  return sets
    .filter((set) => set.version === latestVersion)
    .sort((a, b) => a.setNumber - b.setNumber);
}

type MatchSetLike = {
  version: number;
  setNumber: number;
  team1Games: number;
  team2Games: number;
};

type MatchPairingLike = {
  id: string;
  team1Player1Id: string | null;
  team1Player2Id: string | null;
  team2Player1Id: string | null;
  team2Player2Id: string | null;
  sets: MatchSetLike[];
};

export type MatchSetRow = {
  key: string;
  pairingId: string;
  setNumber: number;
  team1Games: number;
  team2Games: number;
  team1Player1Id: string | null;
  team1Player2Id: string | null;
  team2Player1Id: string | null;
  team2Player2Id: string | null;
};

function buildRotatedRowForSet(input: {
  pairing: MatchPairingLike;
  setNumber: number;
  team1Games: number;
  team2Games: number;
  setIndex: number;
}) {
  const { pairing, setNumber, team1Games, team2Games, setIndex } = input;
  const p1 = pairing.team1Player1Id;
  const p2 = pairing.team1Player2Id;
  const p3 = pairing.team2Player1Id;
  const p4 = pairing.team2Player2Id;

  if (!p1 || !p2 || !p3 || !p4) {
    return {
      key: `${pairing.id}-${setNumber}`,
      pairingId: pairing.id,
      setNumber,
      team1Games,
      team2Games,
      team1Player1Id: p1,
      team1Player2Id: p2,
      team2Player1Id: p3,
      team2Player2Id: p4,
    } satisfies MatchSetRow;
  }

  const rotation = [
    { team1Player1Id: p1, team1Player2Id: p2, team2Player1Id: p3, team2Player2Id: p4 },
    { team1Player1Id: p1, team1Player2Id: p3, team2Player1Id: p2, team2Player2Id: p4 },
    { team1Player1Id: p1, team1Player2Id: p4, team2Player1Id: p2, team2Player2Id: p3 },
  ] as const;

  const rotated = rotation[setIndex] ?? rotation.at(-1)!;
  return {
    key: `${pairing.id}-${setNumber}`,
    pairingId: pairing.id,
    setNumber,
    team1Games,
    team2Games,
    ...rotated,
  } satisfies MatchSetRow;
}

export function buildMatchSetRows(pairings: MatchPairingLike[]): MatchSetRow[] {
  if (pairings.length === 0) return [];

  if (pairings.length === 1) {
    const pairing = pairings[0];
    const latestSets = getLatestVersionSets(pairing.sets);

    return latestSets.map((set, index) =>
      buildRotatedRowForSet({
        pairing,
        setNumber: set.setNumber,
        team1Games: set.team1Games,
        team2Games: set.team2Games,
        setIndex: index,
      })
    );
  }

  const rows = pairings.flatMap((pairing, pairingIndex) => {
    const latestSets = getLatestVersionSets(pairing.sets);
    return latestSets.map((set) => ({
      key: `${pairing.id}-${set.setNumber}`,
      pairingId: pairing.id,
      setNumber: latestSets.length === 1 && pairings.length > 1 ? pairingIndex + 1 : set.setNumber,
      team1Games: set.team1Games,
      team2Games: set.team2Games,
      team1Player1Id: pairing.team1Player1Id,
      team1Player2Id: pairing.team1Player2Id,
      team2Player1Id: pairing.team2Player1Id,
      team2Player2Id: pairing.team2Player2Id,
    } satisfies MatchSetRow));
  });

  return rows.sort((a, b) => a.setNumber - b.setNumber);
}

export function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export type NamedPlayer = { id: string; firstName: string; lastName: string };

/**
 * Produce short display names for a roster.
 *  - Uses only the first name when unique.
 *  - Falls back to `First L` (first name + last initial) when the first name repeats.
 *  - Falls back to `First Last` when a last initial still collides.
 */
export function buildDisplayNameMap(roster: NamedPlayer[]): Map<string, string> {
  const firstNameCounts = new Map<string, number>();
  for (const player of roster) {
    firstNameCounts.set(
      player.firstName,
      (firstNameCounts.get(player.firstName) ?? 0) + 1
    );
  }

  const firstLastInitialCounts = new Map<string, number>();
  for (const player of roster) {
    if ((firstNameCounts.get(player.firstName) ?? 0) <= 1) continue;
    const key = `${player.firstName} ${player.lastName[0] ?? ""}`.trim();
    firstLastInitialCounts.set(key, (firstLastInitialCounts.get(key) ?? 0) + 1);
  }

  const map = new Map<string, string>();
  for (const player of roster) {
    if ((firstNameCounts.get(player.firstName) ?? 0) <= 1) {
      map.set(player.id, player.firstName);
      continue;
    }
    const initialKey = `${player.firstName} ${player.lastName[0] ?? ""}`.trim();
    if ((firstLastInitialCounts.get(initialKey) ?? 0) <= 1) {
      map.set(player.id, initialKey);
      continue;
    }
    map.set(player.id, `${player.firstName} ${player.lastName}`.trim());
  }
  return map;
}