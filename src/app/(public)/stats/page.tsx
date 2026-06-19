import { getStandingsLabel, palominoLeagueRules } from "@/lib/league/rules";
import { getActiveSeasonProjection } from "@/lib/league/season-projection";

export const revalidate = 60;

export default async function StatsPage() {
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
          STATS
        </h1>
        <p className="mt-1 text-sm text-[--color-text-muted]">
          League scoring model: {getStandingsLabel()} match scores, {palominoLeagueRules.matchFormat.setsPerMatch} rotating sets per match.
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-[--color-border] bg-[--color-surface]">
        <table className="w-full text-sm" aria-label="League stats table">
          <thead className="bg-[--color-clay-50] text-xs uppercase tracking-widest text-[--color-text-muted]">
            <tr>
              <th className="px-4 py-3 text-right">#</th>
              <th className="px-4 py-3 text-left">Player</th>
              <th className="px-4 py-3 text-right">{getStandingsLabel()}</th>
              <th className="px-4 py-3 text-right">Avg</th>
              <th className="px-4 py-3 text-right">High</th>
              <th className="px-4 py-3 text-right">Low</th>
              <th className="px-4 py-3 text-right">M</th>
              <th className="px-4 py-3 text-right">SW</th>
              <th className="px-4 py-3 text-right">SL</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[--color-border]">
            {standings.map((row) => (
              <tr key={row.playerName} className="hover:bg-[--color-clay-50] transition-colors">
                <td className="px-4 py-3 text-right">{row.rank}</td>
                <td className="px-4 py-3 font-semibold">{row.playerName}</td>
                <td className="px-4 py-3 text-right font-bold text-[--color-clay-600]">
                  {row.standingsTotal}
                </td>
                <td className="px-4 py-3 text-right">{row.averageScore.toFixed(1)}</td>
                <td className="px-4 py-3 text-right">{row.highScore}</td>
                <td className="px-4 py-3 text-right">{row.lowScore}</td>
                <td className="px-4 py-3 text-right">{row.matchesPlayed}</td>
                <td className="px-4 py-3 text-right">{row.setsWon}</td>
                <td className="px-4 py-3 text-right">{row.setsLost}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-[--color-text-muted]">
        This page keeps the 1.0 league logic visible without forcing a final scorecard storage model. When per-match player scorecards are added, the same rules module can power high/low and top-match breakdowns.
      </p>
    </div>
  );
}