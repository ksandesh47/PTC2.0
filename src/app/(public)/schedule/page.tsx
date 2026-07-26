import { db } from "@/db";
import { matches, players, seasons } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { formatDate } from "@/lib/utils";
import { getLatestVersionSets } from "@/lib/league/display";
import { getMatchFormatLabel, palominoLeagueRules } from "@/lib/league/rules";
import Link from "next/link";

export const revalidate = 60;

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function asSingle(value: string | string[] | undefined) {
  if (!value) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

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

type ScheduleData = Awaited<ReturnType<typeof getSchedule>>;
type ScheduleMatch = ScheduleData["weeks"][number][1][number];

function playerName(playerMap: Map<string, string>, id: string | null | undefined) {
  if (!id) return "TBD";
  return playerMap.get(id) ?? "Unknown player";
}

function lineupIds(match: ScheduleMatch): string[] {
  const ids = new Set<string>();
  for (const pairing of match.pairings) {
    if (pairing.team1Player1Id) ids.add(pairing.team1Player1Id);
    if (pairing.team1Player2Id) ids.add(pairing.team1Player2Id);
    if (pairing.team2Player1Id) ids.add(pairing.team2Player1Id);
    if (pairing.team2Player2Id) ids.add(pairing.team2Player2Id);
  }
  return Array.from(ids);
}

function getWeekDateRange(weekMatches: ScheduleMatch[]): { range: string; isThisWeek: boolean } {
  if (weekMatches.length === 0) return { range: "Date pending", isThisWeek: false };
  
  // Get all dates from matches in this week
  const dates = weekMatches
    .map(m => m.slot?.slotDate)
    .filter(d => d !== null && d !== undefined) as Date[];
  
  if (dates.length === 0) return { range: "Date pending", isThisWeek: false };
  
  // Find first and last dates in the week
  const sortedDates = [...dates].sort((a, b) => a.getTime() - b.getTime());
  const firstDate = new Date(sortedDates[0]);
  const lastDate = new Date(sortedDates[sortedDates.length - 1]);
  
  // Find Monday of the week (go back to nearest Monday)
  const monday = new Date(firstDate);
  const dayOfWeek = monday.getDay(); // 0 = Sunday, 1 = Monday
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  monday.setDate(monday.getDate() - daysToMonday);
  
  // Find Sunday of the week (go forward to nearest Sunday)
  const sunday = new Date(lastDate);
  const daysToSunday = 7 - (sunday.getDay() || 7) % 7;
  sunday.setDate(sunday.getDate() + daysToSunday);
  
  const monthFormatter = new Intl.DateTimeFormat('en-US', { month: 'short' });
  const dayFormatter = new Intl.DateTimeFormat('en-US', { day: 'numeric' });
  
  const mondayMonth = monthFormatter.format(monday);
  const mondayDay = dayFormatter.format(monday);
  const sundayMonth = monthFormatter.format(sunday);
  const sundayDay = dayFormatter.format(sunday);
  
  // Format: "Jul 20 – Jul 26" or "Jul 20 – Aug 2"
  const range = mondayMonth === sundayMonth 
    ? `${mondayMonth} ${mondayDay} – ${sundayDay}`
    : `${mondayMonth} ${mondayDay} – ${sundayMonth} ${sundayDay}`;
  
  // Check if this week is the current week (contains today)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  monday.setHours(0, 0, 0, 0);
  sunday.setHours(0, 0, 0, 0);
  const isThisWeek = today >= monday && today <= sunday;
  
  return { range, isThisWeek };
}

function completedSetRows(match: ScheduleMatch, playerMap: Map<string, string>) {
  const rows: Array<{
    key: string;
    setNumber: number;
    team1Games: number;
    team2Games: number;
    team1Label: string;
    team2Label: string;
  }> = [];

  for (const pairing of match.pairings) {
    const team1Label = `${playerName(playerMap, pairing.team1Player1Id)}${
      pairing.team1Player2Id ? ` & ${playerName(playerMap, pairing.team1Player2Id)}` : ""
    }`;
    const team2Label = `${playerName(playerMap, pairing.team2Player1Id)}${
      pairing.team2Player2Id ? ` & ${playerName(playerMap, pairing.team2Player2Id)}` : ""
    }`;

    for (const set of getLatestVersionSets(pairing.sets)) {
      rows.push({
        key: `${pairing.id}-${set.setNumber}`,
        setNumber: set.setNumber,
        team1Games: set.team1Games,
        team2Games: set.team2Games,
        team1Label,
        team2Label,
      });
    }
  }

  return rows;
}

export default async function SchedulePage({ searchParams }: Readonly<PageProps>) {
  let scheduleData: Awaited<ReturnType<typeof getSchedule>>;
  try {
    scheduleData = await getSchedule();
  } catch {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 text-center space-y-4">
        <h1 className="font-display text-5xl tracking-widest text-[--color-clay-500]">SCHEDULE</h1>
        <p className="text-[--color-text-muted]">Data is temporarily unavailable. Please try again shortly.</p>
      </div>
    );
  }
  const { season, weeks, playerMap } = scheduleData;
  const params = (await searchParams) ?? {};
  const requestedWeek = Number.parseInt(asSingle(params.week) ?? "", 10);

  if (!season) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center text-[--color-text-muted]">
        No active season found.
      </div>
    );
  }

  const weekNumbers = weeks.map(([week]) => week);
  const minWeek = weekNumbers.length > 0 ? Math.min(...weekNumbers) : 1;
  const maxWeek = weekNumbers.length > 0 ? Math.max(...weekNumbers) : 1;
  const selectedWeek = Number.isFinite(requestedWeek)
    ? Math.max(minWeek, Math.min(maxWeek, requestedWeek))
    : minWeek;
  const activeWeekEntry = weeks.find(([week]) => week === selectedWeek) ?? weeks[0];
  const canGoPrev = selectedWeek > minWeek;
  const canGoNext = selectedWeek < maxWeek;

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

      {activeWeekEntry && (
        <div className="rounded-xl border border-[--color-border] bg-[--color-surface] px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            {canGoPrev ? (
              <Link
                href={`/schedule?week=${selectedWeek - 1}`}
                className="rounded-md border border-[--color-border] px-3 py-1.5 text-sm font-semibold hover:bg-[--color-clay-50]"
              >
                ← Prev
              </Link>
            ) : (
              <span className="rounded-md border border-[--color-border] px-3 py-1.5 text-sm font-semibold text-[--color-text-muted] opacity-60">
                ← Prev
              </span>
            )}

            <div className="text-center">
              {(() => {
                const { range, isThisWeek } = activeWeekEntry[1].length > 0 
                  ? getWeekDateRange(activeWeekEntry[1]) 
                  : { range: "Date pending", isThisWeek: false };
                return (
                  <>
                    <p className="font-display text-xl tracking-wider">{range}</p>
                    {isThisWeek && <p className="text-xs text-[--color-text-muted] uppercase tracking-wide">This Week</p>}
                  </>
                );
              })()}
            </div>

            {canGoNext ? (
              <Link
                href={`/schedule?week=${selectedWeek + 1}`}
                className="rounded-md border border-[--color-border] px-3 py-1.5 text-sm font-semibold hover:bg-[--color-clay-50]"
              >
                Next →
              </Link>
            ) : (
              <span className="rounded-md border border-[--color-border] px-3 py-1.5 text-sm font-semibold text-[--color-text-muted] opacity-60">
                Next →
              </span>
            )}
          </div>
        </div>
      )}

      {weeks.length === 0 && (
        <p className="text-[--color-text-muted]">No matches scheduled yet.</p>
      )}

      <div className="space-y-6 animate-stagger">
        {(activeWeekEntry ? [activeWeekEntry] : []).map(([week, weekMatches]) => {
          const { range, isThisWeek } = getWeekDateRange(weekMatches);
          return (
            <section key={week}>
              <h2 className="font-display text-2xl tracking-wider text-[--color-text] mb-3">
                {range}
                {isThisWeek && <span className="ml-3 text-base font-body font-normal text-[--color-text-muted] uppercase tracking-wide">This Week</span>}
              </h2>
              <div className="grid gap-4 lg:grid-cols-2">
                {weekMatches.map((m) => (
                  <ScheduleMatchCard key={m.id} match={m} playerMap={playerMap} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function ScheduleMatchCard({
  match,
  playerMap,
}: Readonly<{ match: ScheduleMatch; playerMap: Map<string, string> }>) {
  const lineup = lineupIds(match);
  const setRows = completedSetRows(match, playerMap);

  return (
    <div className="rounded-xl border border-[--color-border] bg-[--color-surface] p-4 space-y-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[--color-text-muted]">
            {match.slot?.slotDate ? formatDate(match.slot.slotDate) : `Week ${match.weekNumber}`}
          </p>
          <p className="text-sm text-[--color-text-muted]">
            {match.slot?.label ?? match.court ?? "Court TBD"}
          </p>
        </div>
        <StatusBadge status={match.status} />
      </div>

      {match.pairings.length > 0 ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {lineup.map((id, index) => (
            <div
              key={id}
              className="rounded-lg bg-[--color-clay-50] px-3 py-2 text-sm font-semibold"
            >
              <span className="mr-2 text-[--color-text-muted]">{index + 1}</span>
              {playerName(playerMap, id)}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-[--color-text-muted]">Lineup not assigned yet.</p>
      )}

      {match.status === "completed" && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-[--color-text-muted]">
            Set Results
          </p>
          {setRows.map((set) => (
            <div
              key={set.key}
              className="grid grid-cols-[1fr_auto_2.5rem_auto_1fr] items-center gap-2 text-sm"
            >
              <span className="font-medium">{set.team1Label}</span>
              <span className="text-right font-bold text-[--color-clay-600]">{set.team1Games}</span>
              <span className="text-center text-xs text-[--color-text-muted]">S{set.setNumber}</span>
              <span className="font-bold text-[--color-clay-600]">{set.team2Games}</span>
              <span className="text-right font-medium">{set.team2Label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: Readonly<{ status: string }>) {
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
