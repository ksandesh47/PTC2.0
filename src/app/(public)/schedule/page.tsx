import { db } from "@/db";
import { matches, players, seasons } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { formatDate } from "@/lib/utils";
import { getLatestVersionSets } from "@/lib/league/display";
import { getMatchFormatLabel, palominoLeagueRules } from "@/lib/league/rules";

export const revalidate = 60;

async function getSchedule() {
  const activeSeason = await db.query.seasons.findFirst({
    where: eq(seasons.isActive, true),
  });
  if (!activeSeason) return { season: null, weeks: [] };

  const matchRows = await db.query.matches.findMany({
    where: and(eq(matches.seasonId, activeSeason.id)),
    with: {
      slot: true,
      pairings: {
        with: {
          sets: true,
        },
      },
    },
    orderBy: (t, { asc }) => [asc(t.weekNumber), asc(t.createdAt)],
  });

  const playerIds = [...new Set(
    matchRows.flatMap((match) =>
      match.pairings.flatMap((pairing) => [
        pairing.team1Player1Id,
        pairing.team1Player2Id,
        pairing.team2Player1Id,
        pairing.team2Player2Id,
      ])
    ).filter(Boolean)
  )] as string[];

  const playerRows =
    playerIds.length > 0
      ? await db
          .select({ id: players.id, firstName: players.firstName, lastName: players.lastName })
          .from(players)
          .where(inArray(players.id, playerIds))
      : [];

  const playerMap = new Map(
    playerRows.map((player) => [player.id, `${player.firstName} ${player.lastName}`])
  );

  // Group by week
  const weekMap = new Map<number, typeof matchRows>();
  for (const m of matchRows) {
    const list = weekMap.get(m.weekNumber) ?? [];
    list.push(m);
    weekMap.set(m.weekNumber, list);
  }

  return {
    season: activeSeason,
    weeks: [...weekMap.entries()].sort(([a], [b]) => a - b),
    playerMap,
  };
}

function playerName(playerMap: Map<string, string>, id: string | null | undefined) {
  if (!id) return "TBD";
  return playerMap.get(id) ?? "Unknown player";
}

export default async function SchedulePage() {
  const { season, weeks, playerMap } = await getSchedule();

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
          SCHEDULE
        </h1>
        <p className="text-sm text-[--color-text-muted] mt-1">
          {season.name} &middot; {getMatchFormatLabel()} &middot; availability window {palominoLeagueRules.availabilityWindowDays} days
        </p>
      </div>

      {weeks.length === 0 && (
        <p className="text-[--color-text-muted]">No matches scheduled yet.</p>
      )}

      <div className="space-y-6 animate-stagger">
        {weeks.map(([week, weekMatches]) => (
          <section key={week}>
            <h2 className="font-display text-2xl tracking-wider text-[--color-text] mb-3">
              WEEK {week}
              {weekMatches[0]?.slot?.slotDate && (
                <span className="ml-3 text-base font-body font-normal text-[--color-text-muted]">
                  {formatDate(weekMatches[0].slot.slotDate)}
                </span>
              )}
            </h2>
            <div className="grid gap-4 lg:grid-cols-2">
              {weekMatches.map((m) => (
                <div
                  key={m.id}
                  className="rounded-xl border border-[--color-border] bg-[--color-surface] p-4 space-y-4 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-[--color-text-muted]">
                        {m.slot?.slotDate ? formatDate(m.slot.slotDate) : `Week ${m.weekNumber}`}
                      </p>
                      <p className="text-sm text-[--color-text-muted]">
                        {m.slot?.label ?? m.court ?? "Court TBD"}
                      </p>
                    </div>
                    <StatusBadge status={m.status} />
                  </div>

                  {m.pairings.length > 0 ? (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {Array.from(
                        new Set(
                          m.pairings.flatMap((pairing) => [
                            pairing.team1Player1Id,
                            pairing.team1Player2Id,
                            pairing.team2Player1Id,
                            pairing.team2Player2Id,
                          ])
                        )
                      )
                        .filter(Boolean)
                        .map((id, index) => (
                          <div
                            key={id}
                            className="rounded-lg bg-[--color-clay-50] px-3 py-2 text-sm font-semibold"
                          >
                            <span className="mr-2 text-[--color-text-muted]">{index + 1}</span>
                            {playerName(playerMap, id as string)}
                          </div>
                        ))}
                    </div>
                  ) : (
                    <p className="text-sm text-[--color-text-muted]">Lineup not assigned yet.</p>
                  )}

                  {m.status === "completed" && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-widest text-[--color-text-muted]">
                        Set Results
                      </p>
                      {m.pairings.flatMap((pairing) =>
                        getLatestVersionSets(pairing.sets).map((set) => (
                          <div
                            key={`${pairing.id}-${set.setNumber}`}
                            className="grid grid-cols-[1fr_auto_2.5rem_auto_1fr] items-center gap-2 text-sm"
                          >
                            <span className="font-medium">
                              {playerName(playerMap, pairing.team1Player1Id)}
                              {pairing.team1Player2Id ? ` & ${playerName(playerMap, pairing.team1Player2Id)}` : ""}
                            </span>
                            <span className="text-right font-bold text-[--color-clay-600]">{set.team1Games}</span>
                            <span className="text-center text-xs text-[--color-text-muted]">S{set.setNumber}</span>
                            <span className="font-bold text-[--color-clay-600]">{set.team2Games}</span>
                            <span className="text-right font-medium">
                              {playerName(playerMap, pairing.team2Player1Id)}
                              {pairing.team2Player2Id ? ` & ${playerName(playerMap, pairing.team2Player2Id)}` : ""}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    scheduled: "bg-[--color-clay-100] text-[--color-clay-700]",
    in_progress: "bg-yellow-100 text-yellow-700",
    completed: "bg-[--color-forest-100] text-[--color-forest-700]",
    abandoned: "bg-red-100 text-red-700",
    cancelled: "bg-gray-100 text-gray-600",
  };
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${styles[status] ?? styles.scheduled}`}
    >
      {status.replace("_", " ")}
    </span>
  );
}
