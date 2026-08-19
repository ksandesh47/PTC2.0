import { db } from "@/db";
import {
  players,
  seasonPlayers,
  standingsSnapshots,
  matches,
} from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import { buildLeagueStandings, type LeagueMatch } from "./scorecards";

export async function recomputeSeasonStandings(seasonId: string) {
  const [enrolledPlayers, seasonMatches] = await Promise.all([
    db
      .select({
        id: players.id,
        firstName: players.firstName,
        lastName: players.lastName,
      })
      .from(seasonPlayers)
      .innerJoin(players, eq(players.id, seasonPlayers.playerId))
      .where(eq(seasonPlayers.seasonId, seasonId))
      .orderBy(asc(players.firstName), asc(players.lastName)),
    db.query.matches.findMany({
      where: eq(matches.seasonId, seasonId),
      with: {
        slot: true,
        pairings: { with: { sets: true } },
      },
    }),
  ]);

  const standings = buildLeagueStandings({
    players: enrolledPlayers,
    matches: seasonMatches.filter((match) => match.status === "completed") as LeagueMatch[],
  });
  const computedAt = new Date();

  await db.transaction(async (tx) => {
    await tx
      .delete(standingsSnapshots)
      .where(eq(standingsSnapshots.seasonId, seasonId));

    if (standings.length === 0) return;

    await tx.insert(standingsSnapshots).values(
      standings.map((entry) => ({
        seasonId,
        playerId: entry.playerId,
        matchesPlayed: entry.matchesPlayed,
        matchesWon: 0,
        setsWon: entry.setsWon,
        setsLost: entry.setsLost,
        gamesWon: entry.gamesWon,
        gamesLost: entry.gamesLost,
        points: entry.standingsTotal,
        rank: entry.rank,
        computedAt,
      }))
    );
  });

  return { playersUpdated: standings.length, computedAt };
}