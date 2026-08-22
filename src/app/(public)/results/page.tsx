import { formatDate } from "@/lib/utils";
import { buildMatchSetRows } from "@/lib/league/display";
import { getActiveSeasonProjection } from "@/lib/league/season-projection";
import type { PlayerMatchScorecard } from "@/lib/league/scorecards";

export const revalidate = 60;

function playerName(displayNameMap: Map<string, string>, id: string | null | undefined) {
  if (!id) return "TBD";
  return displayNameMap.get(id) ?? "Unknown player";
}

function DataUnavailable() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 text-center space-y-4">
      <h1 className="font-display text-5xl tracking-widest text-(--color-clay-500)">RESULTS</h1>
      <p className="text-(--color-text-muted)">Data is temporarily unavailable. Please try again shortly.</p>
    </div>
  );
}

export default async function ResultsPage() {
  let season: Awaited<ReturnType<typeof getActiveSeasonProjection>>["season"] = null;
  let completedMatches: Awaited<ReturnType<typeof getActiveSeasonProjection>>["completedMatches"] = [];
  let displayNameMap = new Map<string, string>();
  let scorecardsByMatch: Map<string, PlayerMatchScorecard[]> = new Map();
  try {
    const projection = await getActiveSeasonProjection();
    season = projection.season;
    completedMatches = projection.completedMatches;
    displayNameMap = projection.displayNameMap;
    scorecardsByMatch = projection.scorecardsByMatch;
  } catch {
    return <DataUnavailable />;
  }

  if (!season) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center text-(--color-text-muted)">
        No active season found.
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-12 space-y-8 md:w-3/5">
      <div>
        <h1 className="font-display text-5xl tracking-widest text-(--color-clay-500)">
          RESULTS
        </h1>
        <p className="mt-1 text-sm text-(--color-text-muted)">
          Reverse-chronological match ledger for {season.name}
        </p>
      </div>

      {completedMatches.length === 0 && (
        <p className="text-(--color-text-muted)">No completed matches yet.</p>
      )}

      <div className="grid gap-4 lg:grid-cols-2 animate-stagger">
        {completedMatches.map((match) => {
          const matchScorecards = new Map(
            (scorecardsByMatch.get(match.id) ?? []).map((scorecard: PlayerMatchScorecard) => [
              scorecard.playerId,
              scorecard.score,
            ])
          );
          const lineup = Array.from(
            new Set(
              match.pairings.flatMap((pairing) => [
                pairing.team1Player1Id,
                pairing.team1Player2Id,
                pairing.team2Player1Id,
                pairing.team2Player2Id,
              ])
            )
          ).filter(Boolean) as string[];

          const setRows = buildMatchSetRows(match.pairings);

          return (
            <article
              key={match.id}
              className="rounded-xl border border-(--color-border) bg-(--color-surface) overflow-hidden shadow-sm"
            >
              <div className="bg-(--color-clay-800) px-4 py-3 flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wider text-(--color-clay-100)">
                    {match.slot?.slotDate ? formatDate(match.slot.slotDate) : `Week ${match.weekNumber}`}
                  </p>
                  <p className="text-xs text-(--color-clay-300)">
                    {match.slot?.label ?? match.court ?? "Court TBD"}
                  </p>
                </div>
                <span className="whitespace-nowrap rounded-full bg-(--color-forest-200) px-3 py-1 text-xs font-semibold uppercase tracking-wider text-(--color-forest-800)">
                  ✓ Completed{match.matchNumber ? ` · Match #${match.matchNumber}` : ""}
                </span>
              </div>

              <div className="p-4 space-y-4">

              <div className="grid grid-cols-2 gap-2">
                {lineup.map((id, index) => (
                  <div
                    key={id}
                    className="flex min-w-0 items-center justify-between rounded-lg bg-(--color-clay-50) px-2 py-2 text-xs font-semibold sm:px-3 sm:text-sm"
                  >
                    <span className="min-w-0 truncate">
                      <span className="mr-1.5 text-(--color-text-muted) sm:mr-2">{index + 1}</span>
                      {playerName(displayNameMap, id)}
                    </span>
                    <span className="font-display text-lg tracking-wider text-(--color-clay-700)">
                      {matchScorecards.get(id) ?? 0}
                    </span>
                  </div>
                ))}
              </div>

              {setRows.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-widest text-(--color-text-muted)">
                    Match Results
                  </p>
                  {setRows.map((set) => (
                    <div
                      key={set.key}
                      className="grid grid-cols-[1fr_auto_2.5rem_auto_1fr] items-center gap-2 text-sm"
                    >
                      <span className="font-medium">
                        {playerName(displayNameMap, set.team1Player1Id)}
                        {set.team1Player2Id ? ` & ${playerName(displayNameMap, set.team1Player2Id)}` : ""}
                      </span>
                      <span className="text-right font-bold text-(--color-clay-600)">{set.team1Games}</span>
                      <span className="text-center text-xs text-(--color-text-muted)">S{set.setNumber}</span>
                      <span className="font-bold text-(--color-clay-600)">{set.team2Games}</span>
                      <span className="text-right font-medium">
                        {playerName(displayNameMap, set.team2Player1Id)}
                        {set.team2Player2Id ? ` & ${playerName(displayNameMap, set.team2Player2Id)}` : ""}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {setRows.length === 0 && (
                <p className="text-sm text-(--color-text-muted)">
                  Match completed, but no set scorecards have been recorded yet.
                </p>
              )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
