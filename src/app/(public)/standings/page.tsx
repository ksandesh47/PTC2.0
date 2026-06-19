import { formatDate } from "@/lib/utils";
import { getStandingsLabel } from "@/lib/league/rules";
import { getActiveSeasonProjection } from "@/lib/league/season-projection";

export const revalidate = 60; // ISR — revalidate every 60 s

export default async function StandingsPage() {
  const { season, standings } = await getActiveSeasonProjection();

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
          {season.name} &mdash; {getStandingsLabel()} league model &middot; updated{" "}
          {formatDate(new Date())}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {standings.slice(0, 3).map((row, index) => (
          <article
            key={row.playerName}
            className="rounded-xl border border-[--color-border] bg-[--color-surface] p-5 shadow-sm"
          >
            <p className="text-xs uppercase tracking-widest text-[--color-text-muted]">
              {index === 0 ? "Leader" : `Rank ${row.rank}`}
            </p>
            <h2 className="mt-2 font-display text-3xl tracking-wider text-[--color-text]">
              {row.playerName}
            </h2>
            <div className="mt-4 flex items-end justify-between">
              <div>
                <p className="text-xs uppercase tracking-widest text-[--color-text-muted]">
                  {getStandingsLabel()}
                </p>
                <p className="font-display text-4xl tracking-wider text-[--color-clay-600]">
                  {row.standingsTotal}
                </p>
              </div>
              <div className="text-right text-sm text-[--color-text-muted]">
                <p>Avg {row.averageScore.toFixed(1)}</p>
                <p>{row.matchesPlayed} matches</p>
                <p>SW-SL {row.setsWon}-{row.setsLost}</p>
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border border-[--color-border]">
        <table className="w-full text-sm" aria-label="Season standings">
          <thead className="bg-[--color-clay-50] text-[--color-text-muted] text-xs uppercase tracking-widest">
            <tr>
              <th scope="col" className="px-4 py-3 text-right w-10">#</th>
              <th scope="col" className="px-4 py-3 text-left">Player</th>
              <th scope="col" className="px-4 py-3 text-right">{getStandingsLabel()}</th>
              <th scope="col" className="px-4 py-3 text-right">Avg</th>
              <th scope="col" className="px-4 py-3 text-right">MP</th>
              <th scope="col" className="px-4 py-3 text-right hidden sm:table-cell">SW</th>
              <th scope="col" className="px-4 py-3 text-right hidden sm:table-cell">SL</th>
              <th scope="col" className="px-4 py-3 text-right hidden md:table-cell">GW</th>
              <th scope="col" className="px-4 py-3 text-right hidden md:table-cell">GL</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[--color-border] bg-[--color-surface]">
            {standings.map((row) => (
              <tr
                key={row.playerName}
                className="hover:bg-[--color-clay-50] transition-colors"
              >
                <td className="px-4 py-3 text-right text-[--color-text-muted] font-mono">
                  {row.rank}
                </td>
                <td className="px-4 py-3 font-semibold">
                  {row.playerName}
                </td>
                <td className="px-4 py-3 text-right font-bold text-[--color-clay-600]">{row.standingsTotal}</td>
                <td className="px-4 py-3 text-right">{row.averageScore.toFixed(1)}</td>
                <td className="px-4 py-3 text-right">{row.matchesPlayed}</td>
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
              </tr>
            ))}
            {standings.length === 0 && (
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
        League rules stay separate from storage here: {getStandingsLabel()} is derived from projected per-match scorecards built on top of recorded rotating-set results.
      </p>
    </div>
  );
}
