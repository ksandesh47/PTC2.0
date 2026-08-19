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
      <h1 className="font-display text-5xl tracking-widest text-(--color-clay-500)">{title}</h1>
      <p className="text-(--color-text-muted)">Data is temporarily unavailable. Please try again shortly.</p>
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
      <div className="mx-auto max-w-7xl px-4 py-16 text-center text-(--color-text-muted)">
        No active season found.
      </div>
    );
  }

  const top3 = standings.slice(0, 3);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <div>
        <h1 className="font-display text-5xl tracking-widest text-(--color-clay-500)">
          STANDINGS
        </h1>
        <p className="text-sm text-(--color-text-muted) mt-1">
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

      {/* Top-8 match score breakdown */}
      {standings.some((row) => row.countedScorecards.length > 0) && (
        <section className="space-y-3">
          <h2 className="font-display text-2xl tracking-wider">🏅 Top {MIN_MATCHES} Match Score Breakdown</h2>
          <div className="relative rounded-lg border border-(--color-border) after:pointer-events-none after:absolute after:inset-y-0 after:right-0 after:w-8 after:bg-gradient-to-l after:from-(--color-surface) after:to-transparent sm:after:hidden">
            <div className="overflow-x-auto">
              <table className="min-w-max w-full table-fixed text-sm" aria-label="Top match breakdown">
              <thead className="bg-(--color-clay-50) text-(--color-text-muted) text-xs uppercase tracking-widest">
                <tr>
                  <th scope="col" className="sticky left-0 z-20 w-10 min-w-10 bg-(--color-clay-50) px-3 py-3 text-right">#</th>
                  <th scope="col" className="sticky left-10 z-20 w-40 min-w-40 max-w-40 bg-(--color-clay-50) px-3 py-3 text-left">Player</th>
                  <th scope="col" className="px-3 py-3 text-right">Top {MIN_MATCHES}</th>
                  {Array.from({ length: MIN_MATCHES }).map((_, i) => (
                    <th key={i} scope="col" className="px-2 py-3 text-right">
                      M{i + 1}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-(--color-border) bg-(--color-surface)">
                {standings.map((row) => {
                  const scores = Array.from({ length: MIN_MATCHES }).map(
                    (_, i) => row.countedScorecards[i]?.score
                  );
                  const rosterEntry = rosterMap.get(row.playerId);
                  const tooltip = rosterEntry
                    ? needsMoreTooltip({ ...rosterEntry, matchesPlayed: row.matchesPlayed })
                    : undefined;
                  return (
                    <tr key={row.playerId} className="hover:bg-(--color-clay-50)">
                      <td className="sticky left-0 z-10 bg-(--color-surface) px-3 py-2 text-right text-(--color-text-muted) font-mono">
                        {medalFor(row.rank)}
                      </td>
                      <td className="sticky left-10 z-10 w-40 min-w-40 max-w-40 bg-(--color-surface) px-3 py-2 font-semibold">
                        <PlayerNameBadge
                          name={displayNameMap.get(row.playerId) ?? row.playerName}
                          matchesPlayed={row.matchesPlayed}
                          tooltip={tooltip}
                        />
                      </td>
                      <td className="px-3 py-2 text-right font-bold text-(--color-clay-600)">
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
          </div>
          <p className="text-xs text-(--color-text-muted)">
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
    <article className="rounded-xl border border-(--color-border) bg-(--color-surface) overflow-hidden shadow-sm">
      <div className="bg-(--color-clay-100) px-4 py-3 flex items-center gap-3 lg:px-5 lg:py-4">
        <span className="text-3xl leading-none">{medalFor(entry.rank)}</span>
        <h2 className="min-w-0 flex-1 truncate font-display text-2xl tracking-wider text-(--color-text) lg:text-3xl">
          <PlayerNameBadge
            name={displayName}
            matchesPlayed={entry.matchesPlayed}
            tooltip={tooltip}
          />
        </h2>
        <span className="text-xs uppercase tracking-widest text-(--color-clay-600)">
          Rank {entry.rank}
        </span>
      </div>
      <div className="p-2 lg:p-3">
      <div className="mt-0 flex items-end justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-(--color-text-muted)">
            {getStandingsLabel()}
          </p>
          <p className="font-display text-3xl tracking-wider text-(--color-clay-600) lg:text-4xl">
            {entry.standingsTotal}
          </p>
        </div>
        <div className="text-right text-sm text-(--color-text-muted)">
          <p>Total: {entry.total}</p>
          <p>Avg: {entry.averageScore.toFixed(1)} · {entry.matchesPlayed}M</p>
          <p>SW-SL: {entry.setsWon}-{entry.setsLost}</p>
        </div>
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
      <span className="text-[0.65em] font-mono font-normal text-(--color-text-muted)">
        {matchesPlayed}
      </span>
    </span>
  );
}
