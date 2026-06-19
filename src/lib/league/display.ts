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

export function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}