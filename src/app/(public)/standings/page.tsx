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
    <div className="mx-auto w-full max-w-7xl px-4 py-12 space-y-8 md:w-3/5">
      <div>
        <div className="w-full">
          <h1 className="font-display text-5xl tracking-widest text-(--color-clay-500)">
            STANDINGS
          </h1>
          <p className="text-sm text-(--color-text-muted) mt-1">
            {season.name} · {getStandingsLabel()} league model · updated {formatDate(new Date())}
          </p>
        </div>
      </div>

      {/* Podium */}
      {top3.length > 0 && (
        <div className="grid w-full grid-cols-3 gap-3 sm:gap-5">
          {[top3[1], top3[0], top3[2]].filter(Boolean).map((row) => (
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
          <div className="w-full">
            <h2 className="font-display text-2xl tracking-wider">🏅 Top {MIN_MATCHES} Match Score Breakdown</h2>
          </div>
          <div className="relative w-full overflow-hidden rounded-lg border border-(--color-border) after:pointer-events-none after:absolute after:inset-y-0 after:right-0 after:w-8 after:bg-gradient-to-l after:from-(--color-surface) after:to-transparent sm:after:hidden">
            <div className="overflow-x-auto">
              <table className="min-w-max w-full table-fixed text-sm" aria-label="Top match breakdown">
              <thead className="bg-(--color-clay-50) text-(--color-text-muted) text-xs uppercase tracking-widest">
                <tr>
                  <th scope="col" className="sticky left-0 z-20 w-10 min-w-10 bg-(--color-clay-50) px-3 py-3 text-right">#</th>
                  <th scope="col" className="sticky left-10 z-20 w-28 min-w-28 max-w-28 bg-(--color-clay-50) px-3 py-3 text-left lg:w-40 lg:min-w-40 lg:max-w-40">Player</th>
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
                      <td className="sticky left-10 z-10 w-28 min-w-28 max-w-28 bg-(--color-surface) px-3 py-2 font-semibold lg:w-40 lg:min-w-40 lg:max-w-40">
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
  const cardTone = entry.rank === 1
    ? "border-(--color-gold-400) bg-(--color-gold-50)"
    : entry.rank === 2
      ? "border-(--color-slate-300) bg-(--color-slate-50)"
      : "border-(--color-clay-300) bg-(--color-clay-50)";
  const topBorder = entry.rank === 1
    ? "border-t-(--color-gold-500)"
    : entry.rank === 2
      ? "border-t-(--color-slate-400)"
      : "border-t-(--color-clay-500)";
  return (
    <article className={`rounded-xl border border-t-4 ${topBorder} ${cardTone} px-3 py-4 shadow-sm sm:px-5 sm:py-5`}>
      <div className="flex items-start justify-between gap-2">
        <span className="text-2xl leading-none sm:text-3xl">{medalFor(entry.rank)}</span>
        <span className="text-xs text-(--color-text)">#{entry.rank}</span>
      </div>
      <div className="mt-3">
        <h2 className="min-w-0 truncate font-display text-xl tracking-wider text-(--color-text) sm:text-2xl">
          <PlayerNameBadge
            name={displayName}
            matchesPlayed={entry.matchesPlayed}
            tooltip={tooltip}
          />
        </h2>
      </div>
      <div className="mt-3 flex items-end justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-widest text-(--color-text-muted)">
            {getStandingsLabel()}
          </p>
          <p className="font-display text-3xl tracking-wider text-(--color-clay-600) sm:text-4xl">
            {entry.standingsTotal}
          </p>
        </div>
      </div>
      <div className="mt-3 text-xs leading-[1.45] text-(--color-text-muted) sm:text-sm">
        <p>Total: {entry.total}</p>
        <p>Avg: {entry.averageScore.toFixed(1)} · {entry.matchesPlayed}M</p>
        <p>SW-SL: {entry.setsWon}-{entry.setsLost}</p>
      </div>
    </article>
  );
}

function PlayerNameBadge({
  name,
  matchesPlayed,
  tooltip,
}: Readonly<{ name: string; matchesPlayed: number; tooltip: string | undefined }>) {
  const needsMatches = matchesPlayed < MIN_MATCHES;
  return (
    <span
      className={`inline-flex max-w-full items-baseline gap-1 ${needsMatches
        ? "rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-red-600"
        : ""}`}
      title={tooltip}
    >
      <span className="truncate">{name}</span>
      <span className={`text-[0.65em] font-mono font-normal ${needsMatches ? "text-red-500" : "text-(--color-text-muted)"}`}>
        {matchesPlayed}
      </span>
    </span>
  );
}
