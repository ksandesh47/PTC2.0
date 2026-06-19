import { db } from "@/db";
import { matches, players, seasonPlayers, seasons } from "@/db/schema";
import { and, asc, desc, eq } from "drizzle-orm";
import {
  buildLeagueStandings,
  buildScorecardsByMatch,
  type LeagueMatch,
} from "./scorecards";

export async function getActiveSeasonProjection() {
  const activeSeason = await db.query.seasons.findFirst({
    where: eq(seasons.isActive, true),
  });

  if (!activeSeason) {
    return {
      season: null,
      players: [],
      completedMatches: [],
      allMatches: [],
      standings: [],
      scorecardsByMatch: new Map(),
      playerMap: new Map<string, string>(),
    };
  }

  const enrolledPlayers = await db
    .select({
      id: players.id,
      firstName: players.firstName,
      lastName: players.lastName,
    })
    .from(seasonPlayers)
    .innerJoin(players, eq(players.id, seasonPlayers.playerId))
    .where(eq(seasonPlayers.seasonId, activeSeason.id))
    .orderBy(asc(players.firstName), asc(players.lastName));

  const allMatches = (await db.query.matches.findMany({
    where: eq(matches.seasonId, activeSeason.id),
    with: {
      slot: true,
      pairings: {
        with: {
          sets: true,
        },
      },
    },
    orderBy: [asc(matches.weekNumber), desc(matches.createdAt)],
  })) as LeagueMatch[];

  const completedMatches = allMatches.filter((match) => match.status === "completed");
  const standings = buildLeagueStandings({
    players: enrolledPlayers,
    matches: completedMatches,
  });

  return {
    season: activeSeason,
    players: enrolledPlayers,
    completedMatches,
    allMatches,
    standings,
    scorecardsByMatch: buildScorecardsByMatch(completedMatches),
    playerMap: new Map(
      enrolledPlayers.map((player) => [player.id, `${player.firstName} ${player.lastName}`])
    ),
  };
}