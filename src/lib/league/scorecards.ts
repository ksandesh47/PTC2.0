import { palominoLeagueRules } from "./rules";
import { getLatestVersionSets } from "./display";

export type LeagueSet = {
  version: number;
  setNumber: number;
  team1Games: number;
  team2Games: number;
};

export type LeaguePairing = {
  id: string;
  team1Player1Id: string;
  team1Player2Id: string | null;
  team2Player1Id: string;
  team2Player2Id: string | null;
  sets: LeagueSet[];
};

export type LeagueMatch = {
  id: string;
  weekNumber: number;
  court: string | null;
  status: string;
  slot?: {
    label: string;
    slotDate: string | Date;
  } | null;
  pairings: LeaguePairing[];
};

export type PlayerIdentity = {
  id: string;
  firstName: string;
  lastName: string;
};

export type PlayerMatchScorecard = {
  playerId: string;
  matchId: string;
  weekNumber: number;
  score: number;
  setsWon: number;
  setsLost: number;
  gamesWon: number;
  gamesLost: number;
};

export type LeagueStandingsEntry = {
  playerId: string;
  playerName: string;
  rank: number;
  standingsTotal: number;
  countedMatches: number;
  averageScore: number;
  highScore: number;
  lowScore: number;
  matchesPlayed: number;
  setsWon: number;
  setsLost: number;
  gamesWon: number;
  gamesLost: number;
  scorecards: PlayerMatchScorecard[];
  countedScorecards: PlayerMatchScorecard[];
};

function uniquePlayers(ids: Array<string | null>) {
  return ids.filter(Boolean) as string[];
}

export function computeProjectedMatchScore(input: {
  setPointEntries: Array<{
    teamGames: number;
    opponentGames: number;
    wonSet: boolean;
  }>;
}) {
  // Palomino 1.0 derived formula (set-level):
  // - Losing side receives their set games.
  // - Winning side receives their set games + margin bonus.
  //   Example: 6-2 => winners 10, losers 2. 7-6 => winners 8, losers 6.
  return input.setPointEntries.reduce((sum, set) => {
    if (!set.wonSet) return sum + set.teamGames;

    const marginBonus = set.teamGames - set.opponentGames;
    return sum + set.teamGames + marginBonus;
  }, 0);
}

export function buildMatchScorecards(match: LeagueMatch) {
  const statsByPlayer = new Map<
    string,
    Omit<PlayerMatchScorecard, "playerId" | "matchId" | "weekNumber" | "score"> & {
      setPointEntries: Array<{
        teamGames: number;
        opponentGames: number;
        wonSet: boolean;
      }>;
    }
  >();

  function ensure(playerId: string) {
    const existing = statsByPlayer.get(playerId);
    if (existing) return existing;

    const next = {
      setsWon: 0,
      setsLost: 0,
      gamesWon: 0,
      gamesLost: 0,
      setPointEntries: [],
    };
    statsByPlayer.set(playerId, next);
    return next;
  }

  for (const pairing of match.pairings) {
    const latestSets = getLatestVersionSets(pairing.sets);
    const team1Players = uniquePlayers([
      pairing.team1Player1Id,
      pairing.team1Player2Id,
    ]);
    const team2Players = uniquePlayers([
      pairing.team2Player1Id,
      pairing.team2Player2Id,
    ]);

    for (const set of latestSets) {
      const team1Won = set.team1Games > set.team2Games;

      for (const playerId of team1Players) {
        const stats = ensure(playerId);
        stats.gamesWon += set.team1Games;
        stats.gamesLost += set.team2Games;
        stats.setPointEntries.push({
          teamGames: set.team1Games,
          opponentGames: set.team2Games,
          wonSet: team1Won,
        });
        if (team1Won) stats.setsWon += 1;
        else stats.setsLost += 1;
      }

      for (const playerId of team2Players) {
        const stats = ensure(playerId);
        stats.gamesWon += set.team2Games;
        stats.gamesLost += set.team1Games;
        stats.setPointEntries.push({
          teamGames: set.team2Games,
          opponentGames: set.team1Games,
          wonSet: !team1Won,
        });
        if (team1Won) stats.setsLost += 1;
        else stats.setsWon += 1;
      }
    }
  }

  return [...statsByPlayer.entries()].map(([playerId, stats]) => ({
    playerId,
    matchId: match.id,
    weekNumber: match.weekNumber,
    score: computeProjectedMatchScore({ setPointEntries: stats.setPointEntries }),
    setsWon: stats.setsWon,
    setsLost: stats.setsLost,
    gamesWon: stats.gamesWon,
    gamesLost: stats.gamesLost,
  }));
}

export function buildLeagueStandings(input: {
  players: PlayerIdentity[];
  matches: LeagueMatch[];
}) {
  const scorecardsByPlayer = new Map<string, PlayerMatchScorecard[]>();

  for (const match of input.matches) {
    for (const scorecard of buildMatchScorecards(match)) {
      const existing = scorecardsByPlayer.get(scorecard.playerId) ?? [];
      existing.push(scorecard);
      scorecardsByPlayer.set(scorecard.playerId, existing);
    }
  }

  const standings = input.players.map((player) => {
    const scorecards = (scorecardsByPlayer.get(player.id) ?? []).sort(
      (a, b) => b.score - a.score || a.weekNumber - b.weekNumber
    );
    const countedScorecards = scorecards.slice(
      0,
      palominoLeagueRules.standings.topMatchCount
    );
    const standingsTotal = countedScorecards.reduce(
      (sum, scorecard) => sum + scorecard.score,
      0
    );
    const matchesPlayed = scorecards.length;
    const setsWon = scorecards.reduce((sum, scorecard) => sum + scorecard.setsWon, 0);
    const setsLost = scorecards.reduce((sum, scorecard) => sum + scorecard.setsLost, 0);
    const gamesWon = scorecards.reduce((sum, scorecard) => sum + scorecard.gamesWon, 0);
    const gamesLost = scorecards.reduce((sum, scorecard) => sum + scorecard.gamesLost, 0);
    const highScore = scorecards[0]?.score ?? 0;
    const lowScore = scorecards.length
      ? Math.min(...scorecards.map((scorecard) => scorecard.score))
      : 0;

    return {
      playerId: player.id,
      playerName: `${player.firstName} ${player.lastName}`,
      rank: 0,
      standingsTotal,
      countedMatches: countedScorecards.length,
      averageScore:
        countedScorecards.length > 0
          ? standingsTotal / countedScorecards.length
          : 0,
      highScore,
      lowScore,
      matchesPlayed,
      setsWon,
      setsLost,
      gamesWon,
      gamesLost,
      scorecards,
      countedScorecards,
    } satisfies LeagueStandingsEntry;
  });

  return standings
    .sort((a, b) => {
      if (b.standingsTotal !== a.standingsTotal) {
        return b.standingsTotal - a.standingsTotal;
      }
      if (b.averageScore !== a.averageScore) {
        return b.averageScore - a.averageScore;
      }
      if (b.setsWon !== a.setsWon) {
        return b.setsWon - a.setsWon;
      }
      return b.gamesWon - a.gamesWon;
    })
    .map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));
}

export function buildScorecardsByMatch(matches: LeagueMatch[]) {
  return new Map(matches.map((match) => [match.id, buildMatchScorecards(match)]));
}