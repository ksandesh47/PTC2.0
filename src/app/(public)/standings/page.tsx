import { formatDate } from "@/lib/utils";
import { getStandingsLabel, palominoLeagueRules } from "@/lib/league/rules";
import { getActiveSeasonProjection } from "@/lib/league/season-projection";
import { buildDisplayNameMap } from "@/lib/league/display";
import type { LeagueStandingsEntry } from "@/lib/league/scorecards";

export const revalidate = 60;

const MIN_MATCHES = palominoLeagueRules.standings.topMatchCount;

function DataUnavailable({ title }: Readonly<{ title: string }>) {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 text-center space-y-4">
      <h1 className="font-display text-5xl tracking-widest text-[--color-clay-500]">{title}</h1>
      <p className="text-[--color-text-muted]">Data is temporarily unavailable. Please try again shortly.</p>
    </div>
  );
}

function medalFor(rank: number): string {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return `#${rank}`;
}

function pluralMatches(n: number) {
  return n === 1 ? "match" : "matches";
}

type NameBadgeInput = { firstName: string; lastName: string; matchesPlayed: number };

function needsMoreTooltip(entry: NameBadgeInput): string | undefined {
  if (entry.matchesPlayed >= MIN_MATCHES) return undefined;
  const remaining = MIN_MATCHES - entry.matchesPlayed;
  return `${entry.firstName} needs ${remaining} more ${pluralMatches(remaining)}`;
}

export default async function StandingsPage() {
  let season: Awaited<ReturnType<typeof getActiveSeasonProjection>>["season"] = null;
  let standings: Awaited<ReturnType<typeof getActiveSeasonProjection>>["standings"] = [];
  let displayNameMap = new Map<string, string>();
  let rosterMap = new Map<string, { firstName: string; lastName: string }>();
  try {
    const projection = await getActiveSeasonProjection();
    season = projection.season;
    standings = projection.standings;
    displayNameMap = projection.displayNameMap;
    rosterMap = new Map(
      projection.players.map((p) => [p.id, { firstName: p.firstName, lastName: p.lastName }])
    );
    if (displayNameMap.size === 0) {
      displayNameMap = buildDisplayNameMap(projection.players);
    }
  } catch {
    return <DataUnavailable title="STANDINGS" />;
  }

  if (!season) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center text-[--color-text-muted]">
        No active season found.
      </div>
    );
  }

  const top3 = standings.slice(0, 3);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <div>
        <h1 className="font-display text-5xl tracking-widest text-[--color-clay-500]">
          STANDINGS
        </h1>
        <p className="text-sm text-[--color-text-muted] mt-1">
          {season.name} · {getStandingsLabel()} league model · updated {formatDate(new Date())}
        </p>
      </div>

      {/* Podium */}
      {top3.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-3">
          {top3.map((row) => (
            <PodiumCard
              key={row.playerId}
              entry={row}
              displayName={displayNameMap.get(row.playerId) ?? row.playerName}
              rosterEntry={rosterMap.get(row.playerId)}
            />
          ))}
        </div>
      )}

      {/* Standings table */}
      <div className="overflow-x-auto rounded-lg border border-[--color-border]">
        <table className="w-full text-sm" aria-label="Season standings">
          <thead className="bg-[--color-clay-50] text-[--color-text-muted] text-xs uppercase tracking-widest">
            <tr>
              <th scope="col" className="px-3 py-3 text-right w-10">#</th>
              <th scope="col" className="px-3 py-3 text-left">Player</th>
              <th scope="col" className="px-3 py-3 text-right">{getStandingsLabel()}</th>
              <th scope="col" className="px-3 py-3 text-right hidden sm:table-cell">Total</th>
              <th scope="col" className="px-3 py-3 text-right">Avg</th>
              <th scope="col" className="px-3 py-3 text-right">M</th>
              <th scope="col" className="px-3 py-3 text-right hidden sm:table-cell">SW</th>
              <th scope="col" className="px-3 py-3 text-right hidden sm:table-cell">SL</th>
              <th scope="col" className="px-3 py-3 text-right hidden md:table-cell">GW</th>
              <th scope="col" className="px-3 py-3 text-right hidden md:table-cell">GL</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[--color-border] bg-[--color-surface]">
            {standings.map((row) => {
              const rosterEntry = rosterMap.get(row.playerId);
              const tooltip = rosterEntry
                ? needsMoreTooltip({ ...rosterEntry, matchesPlayed: row.matchesPlayed })
                : undefined;
              return (
                <tr key={row.playerId} className="hover:bg-[--color-clay-50] transition-colors">
                  <td className="px-3 py-3 text-right text-[--color-text-muted] font-mono">
                    {medalFor(row.rank)}
                  </td>
                  <td className="px-3 py-3 font-semibold">
                    <PlayerNameBadge
                      name={displayNameMap.get(row.playerId) ?? row.playerName}
                      matchesPlayed={row.matchesPlayed}
                      tooltip={tooltip}
                    />
                  </td>
                  <td className="px-3 py-3 text-right font-bold text-[--color-clay-600]">
                    {row.standingsTotal}
                  </td>
                  <td className="px-3 py-3 text-right hidden sm:table-cell">{row.total}</td>
                  <td className="px-3 py-3 text-right">{row.averageScore.toFixed(1)}</td>
                  <td className="px-3 py-3 text-right">{row.matchesPlayed}</td>
                  <td className="px-3 py-3 text-right hidden sm:table-cell">{row.setsWon}</td>
                  <td className="px-3 py-3 text-right hidden sm:table-cell">{row.setsLost}</td>
                  <td className="px-3 py-3 text-right hidden md:table-cell">{row.gamesWon}</td>
                  <td className="px-3 py-3 text-right hidden md:table-cell">{row.gamesLost}</td>
                </tr>
              );
            })}
            {standings.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-[--color-text-muted]">
                  No standings data yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Top-8 match score breakdown */}
      {standings.some((row) => row.countedScorecards.length > 0) && (
        <section className="space-y-3">
          <h2 className="font-display text-2xl tracking-wider">🏅 Top {MIN_MATCHES} Match Score Breakdown</h2>
          <div className="overflow-x-auto rounded-lg border border-[--color-border]">
            <table className="w-full text-sm" aria-label="Top match breakdown">
              <thead className="bg-[--color-clay-50] text-[--color-text-muted] text-xs uppercase tracking-widest">
                <tr>
                  <th scope="col" className="px-3 py-3 text-right w-10">#</th>
                  <th scope="col" className="px-3 py-3 text-left">Player</th>
                  <th scope="col" className="px-3 py-3 text-right">Top {MIN_MATCHES}</th>
                  {Array.from({ length: MIN_MATCHES }).map((_, i) => (
                    <th key={i} scope="col" className="px-2 py-3 text-right">
                      M{i + 1}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[--color-border] bg-[--color-surface]">
                {standings.map((row) => {
                  const scores = Array.from({ length: MIN_MATCHES }).map(
                    (_, i) => row.countedScorecards[i]?.score
                  );
                  const rosterEntry = rosterMap.get(row.playerId);
                  const tooltip = rosterEntry
                    ? needsMoreTooltip({ ...rosterEntry, matchesPlayed: row.matchesPlayed })
                    : undefined;
                  return (
                    <tr key={row.playerId} className="hover:bg-[--color-clay-50]">
                      <td className="px-3 py-2 text-right text-[--color-text-muted] font-mono">
                        {medalFor(row.rank)}
                      </td>
                      <td className="px-3 py-2 font-semibold">
                        <PlayerNameBadge
                          name={displayNameMap.get(row.playerId) ?? row.playerName}
                          matchesPlayed={row.matchesPlayed}
                          tooltip={tooltip}
                        />
                      </td>
                      <td className="px-3 py-2 text-right font-bold text-[--color-clay-600]">
                        {row.standingsTotal}
                      </td>
                      {scores.map((score, i) => (
                        <td key={i} className="px-2 py-2 text-right font-mono">
                          {score ?? "–"}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-[--color-text-muted]">
            M1–M{MIN_MATCHES} = top {MIN_MATCHES} match scores (sorted high→low).
          </p>
        </section>
      )}
    </div>
  );
}

function PodiumCard({
  entry,
  displayName,
  rosterEntry,
}: Readonly<{
  entry: LeagueStandingsEntry;
  displayName: string;
  rosterEntry: { firstName: string; lastName: string } | undefined;
}>) {
  const tooltip = rosterEntry
    ? needsMoreTooltip({ ...rosterEntry, matchesPlayed: entry.matchesPlayed })
    : undefined;
  return (
    <article className="rounded-xl border border-[--color-border] bg-[--color-surface] p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-3xl leading-none">{medalFor(entry.rank)}</span>
        <span className="text-xs uppercase tracking-widest text-[--color-text-muted]">
          Rank {entry.rank}
        </span>
      </div>
      <h2 className="mt-3 font-display text-3xl tracking-wider text-[--color-text]">
        <PlayerNameBadge
          name={displayName}
          matchesPlayed={entry.matchesPlayed}
          tooltip={tooltip}
        />
      </h2>
      <div className="mt-4 flex items-end justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-[--color-text-muted]">
            {getStandingsLabel()}
          </p>
          <p className="font-display text-4xl tracking-wider text-[--color-clay-600]">
            {entry.standingsTotal}
          </p>
        </div>
        <div className="text-right text-sm text-[--color-text-muted]">
          <p>Total: {entry.total}</p>
          <p>Avg: {entry.averageScore.toFixed(1)} · {entry.matchesPlayed}M</p>
          <p>SW-SL: {entry.setsWon}-{entry.setsLost}</p>
        </div>
      </div>
    </article>
  );
}

function PlayerNameBadge({
  name,
  matchesPlayed,
  tooltip,
}: Readonly<{ name: string; matchesPlayed: number; tooltip: string | undefined }>) {
  return (
    <span className="inline-flex items-baseline gap-1" title={tooltip}>
      <span>{name}</span>
      <span className="text-[0.65em] font-mono font-normal text-[--color-text-muted]">
        {matchesPlayed}
      </span>
    </span>
  );
}
