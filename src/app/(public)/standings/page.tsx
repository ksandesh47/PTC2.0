import { db } from "@/db";
import { standingsSnapshots, players, seasons } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { formatDate } from "@/lib/utils";

export const revalidate = 60; // ISR — revalidate every 60 s

async function getActiveSeasonStandings() {
  const activeSeason = await db.query.seasons.findFirst({
    where: eq(seasons.isActive, true),
  });
  if (!activeSeason) return { season: null, rows: [] };

  const rows = await db
    .select({
      rank: standingsSnapshots.rank,
      firstName: players.firstName,
      lastName: players.lastName,
      matchesPlayed: standingsSnapshots.matchesPlayed,
      matchesWon: standingsSnapshots.matchesWon,
      setsWon: standingsSnapshots.setsWon,
      setsLost: standingsSnapshots.setsLost,
      gamesWon: standingsSnapshots.gamesWon,
      gamesLost: standingsSnapshots.gamesLost,
      points: standingsSnapshots.points,
      computedAt: standingsSnapshots.computedAt,
    })
    .from(standingsSnapshots)
    .innerJoin(players, eq(players.id, standingsSnapshots.playerId))
    .where(eq(standingsSnapshots.seasonId, activeSeason.id))
    .orderBy(desc(standingsSnapshots.points), desc(standingsSnapshots.setsWon));

  return { season: activeSeason, rows };
}

export default async function StandingsPage() {
  const { season, rows } = await getActiveSeasonStandings();

  if (!season) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center text-[--color-text-muted]">
        No active season found.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 space-y-6">
      <div>
        <h1 className="font-display text-5xl tracking-widest text-[--color-clay-500]">
          STANDINGS
        </h1>
        <p className="text-sm text-[--color-text-muted] mt-1">
          {season.name} &mdash; updated{" "}
          {rows[0] ? formatDate(rows[0].computedAt) : "—"}
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-[--color-border]">
        <table className="w-full text-sm" aria-label="Season standings">
          <thead className="bg-[--color-clay-50] text-[--color-text-muted] text-xs uppercase tracking-widest">
            <tr>
              <th scope="col" className="px-4 py-3 text-right w-10">#</th>
              <th scope="col" className="px-4 py-3 text-left">Player</th>
              <th scope="col" className="px-4 py-3 text-right">MP</th>
              <th scope="col" className="px-4 py-3 text-right">MW</th>
              <th scope="col" className="px-4 py-3 text-right hidden sm:table-cell">SW</th>
              <th scope="col" className="px-4 py-3 text-right hidden sm:table-cell">SL</th>
              <th scope="col" className="px-4 py-3 text-right hidden md:table-cell">GW</th>
              <th scope="col" className="px-4 py-3 text-right hidden md:table-cell">GL</th>
              <th scope="col" className="px-4 py-3 text-right font-bold">Pts</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[--color-border] bg-[--color-surface]">
            {rows.map((row, i) => (
              <tr
                key={`${row.firstName}-${row.lastName}`}
                className="hover:bg-[--color-clay-50] transition-colors"
              >
                <td className="px-4 py-3 text-right text-[--color-text-muted] font-mono">
                  {row.rank ?? i + 1}
                </td>
                <td className="px-4 py-3 font-semibold">
                  {row.firstName} {row.lastName}
                </td>
                <td className="px-4 py-3 text-right">{row.matchesPlayed}</td>
                <td className="px-4 py-3 text-right text-[--color-success]">
                  {row.matchesWon}
                </td>
                <td className="px-4 py-3 text-right hidden sm:table-cell">
                  {row.setsWon}
                </td>
                <td className="px-4 py-3 text-right hidden sm:table-cell">
                  {row.setsLost}
                </td>
                <td className="px-4 py-3 text-right hidden md:table-cell">
                  {row.gamesWon}
                </td>
                <td className="px-4 py-3 text-right hidden md:table-cell">
                  {row.gamesLost}
                </td>
                <td className="px-4 py-3 text-right font-bold text-[--color-clay-600]">
                  {row.points}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={9}
                  className="px-4 py-8 text-center text-[--color-text-muted]"
                >
                  No standings data yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-[--color-text-muted]">
        MP = Matches Played · MW = Matches Won · SW/SL = Sets · GW/GL = Games · Pts = Points
      </p>
    </div>
  );
}
