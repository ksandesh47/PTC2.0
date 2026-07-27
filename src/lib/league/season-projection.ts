import { db } from "@/db";
import { matches, players, seasonPlayers, seasons } from "@/db/schema";
import { asc, desc, eq } from "drizzle-orm";
import {
  buildLeagueStandings,
  buildScorecardsByMatch,
  type LeagueMatch,
} from "./scorecards";
import { buildDisplayNameMap } from "./display";
import { parseDateInput } from "./week-slots";

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
      displayNameMap: new Map<string, string>(),
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

  const completedMatches = allMatches
    .filter((match) => match.status === "completed")
    .toSorted((a, b) => {
      const aTime = a.slot?.slotDate
        ? parseDateInput(a.slot.slotDate).getTime()
        : 0;
      const bTime = b.slot?.slotDate
        ? parseDateInput(b.slot.slotDate).getTime()
        : 0;
      if (bTime !== aTime) return bTime - aTime;
      return (b.matchNumber ?? 0) - (a.matchNumber ?? 0);
    });

  const standings = buildLeagueStandings({
    players: enrolledPlayers,
    matches: completedMatches,
  });

  const displayNameMap = buildDisplayNameMap(enrolledPlayers);

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
    displayNameMap,
  };
}