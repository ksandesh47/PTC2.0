import { formatDate } from "@/lib/utils";
import { getLatestVersionSets } from "@/lib/league/display";
import { getActiveSeasonProjection } from "@/lib/league/season-projection";

export const revalidate = 60;

function playerName(playerMap: Map<string, string>, id: string | null | undefined) {
  if (!id) return "TBD";
  return playerMap.get(id) ?? "Unknown player";
}

export default async function ResultsPage() {
  const { season, completedMatches, playerMap, scorecardsByMatch } =
    await getActiveSeasonProjection();

  if (!season) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center text-[--color-text-muted]">
        No active season found.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <div>
        <h1 className="font-display text-5xl tracking-widest text-[--color-clay-500]">
          RESULTS
        </h1>
        <p className="mt-1 text-sm text-[--color-text-muted]">
          Reverse-chronological match ledger for {season.name}
        </p>
      </div>

      {completedMatches.length === 0 && (
        <p className="text-[--color-text-muted]">No completed matches yet.</p>
      )}

      <div className="space-y-6 animate-stagger">
        {completedMatches.map((match) => {
          const matchScorecards = new Map(
            (scorecardsByMatch.get(match.id) ?? []).map((scorecard) => [
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

          return (
            <article
              key={match.id}
              className="rounded-xl border border-[--color-border] bg-[--color-surface] p-5 shadow-sm"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm text-[--color-text-muted]">
                    <span>{match.slot?.slotDate ? formatDate(match.slot.slotDate) : `Week ${match.weekNumber}`}</span>
                    <span>•</span>
                    <span>{match.slot?.label ?? match.court ?? "Court TBD"}</span>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    {lineup.map((id, index) => (
                      <div
                        key={id}
                        className="rounded-lg bg-[--color-clay-50] px-3 py-2 text-sm font-semibold"
                      >
                        <span className="mr-2 text-[--color-text-muted]">{index + 1}</span>
                        {playerName(playerMap, id)}
                        <span className="ml-2 text-[--color-clay-600]">
                          {matchScorecards.get(id) ?? 0}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <span className="rounded-full bg-[--color-forest-100] px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[--color-forest-700]">
                  Completed
                </span>
              </div>

              <div className="mt-5 space-y-3">
                <h2 className="font-display text-xl tracking-wider">Set Results</h2>
                {match.pairings.flatMap((pairing) =>
                  getLatestVersionSets(pairing.sets).map((set) => (
                    <div
                      key={`${pairing.id}-${set.setNumber}`}
                      className="grid gap-2 rounded-lg border border-[--color-border] px-4 py-3 sm:grid-cols-[1fr_auto_3rem_auto_1fr] sm:items-center"
                    >
                      <span className="font-semibold">
                        {playerName(playerMap, pairing.team1Player1Id)}
                        {pairing.team1Player2Id ? ` & ${playerName(playerMap, pairing.team1Player2Id)}` : ""}
                      </span>
                      <span className="text-right text-lg font-bold text-[--color-clay-600]">
                        {set.team1Games}
                      </span>
                      <span className="text-center text-xs font-semibold uppercase tracking-wider text-[--color-text-muted]">
                        S{set.setNumber}
                      </span>
                      <span className="text-left text-lg font-bold text-[--color-clay-600]">
                        {set.team2Games}
                      </span>
                      <span className="font-semibold sm:text-right">
                        {playerName(playerMap, pairing.team2Player1Id)}
                        {pairing.team2Player2Id ? ` & ${playerName(playerMap, pairing.team2Player2Id)}` : ""}
                      </span>
                    </div>
                  ))
                )}

                {match.pairings.every((pairing) => pairing.sets.length === 0) && (
                  <p className="text-sm text-[--color-text-muted]">
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