import { db } from "@/db";
import {
  availabilitySlots,
  matches,
  players,
  seasonPlayers,
  seasons,
} from "@/db/schema";
import { and, asc, eq } from "drizzle-orm";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { buildMatchSetRows, buildDisplayNameMap } from "@/lib/league/display";
import { getMatchFormatLabel, palominoLeagueRules } from "@/lib/league/rules";
import {
  buildMatchScorecards,
  type LeagueMatch,
} from "@/lib/league/scorecards";
import {
  buildSeasonWeekRanges,
  buildWeekSlotLayout,
  isBetweenInclusive,
  parseDateInput,
  resolveRunningWeek,
  toMidnight,
  type WeekSlot,
} from "@/lib/league/week-slots";
import { createClient } from "@/lib/supabase/server";
import { PlayerSubstituteControls } from "@/components/substitutes/PlayerSubstituteControls";

export const revalidate = 60;

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function asSingle(value: string | string[] | undefined) {
  if (!value) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

function playerName(displayNameMap: Map<string, string>, id: string | null | undefined) {
  if (!id) return "TBD";
  return displayNameMap.get(id) ?? "Unknown player";
}

async function getScheduleData() {
  const activeSeason = await db.query.seasons.findFirst({
    where: eq(seasons.isActive, true),
  });
  if (!activeSeason) {
    return {
      season: null,
      allMatches: [] as LeagueMatch[],
      allSlots: [] as Array<{ id: string; label: string; slotDate: string | Date }>,
      displayNameMap: new Map<string, string>(),
    };
  }

  const [matchRows, slotRows, roster] = await Promise.all([
    db.query.matches.findMany({
      where: eq(matches.seasonId, activeSeason.id),
      with: {
        slot: true,
        pairings: {
          with: { sets: true },
        },
      },
      orderBy: (t, { asc }) => [asc(t.weekNumber), asc(t.createdAt)],
    }),
    db.query.availabilitySlots.findMany({
      where: eq(availabilitySlots.seasonId, activeSeason.id),
      orderBy: (t, { asc }) => [asc(t.slotDate), asc(t.createdAt)],
    }),
    db
      .select({
        id: players.id,
        firstName: players.firstName,
        lastName: players.lastName,
      })
      .from(seasonPlayers)
      .innerJoin(players, eq(players.id, seasonPlayers.playerId))
      .where(and(eq(seasonPlayers.seasonId, activeSeason.id)))
      .orderBy(asc(players.firstName), asc(players.lastName)),
  ]);

  const displayNameMap = buildDisplayNameMap(roster);

  return {
    season: activeSeason,
    allMatches: matchRows as LeagueMatch[],
    allSlots: slotRows,
    displayNameMap,
  };
}

async function getViewerPlayerId(): Promise<string | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    const linked = await db.query.players.findFirst({
      where: eq(players.userId, user.id),
      columns: { id: true },
    });
    return linked?.id ?? null;
  } catch {
    return null;
  }
}

function slotTimeFromLabel(label: string | undefined): string | null {
  if (!label) return null;
  const timeMatch = /(\d{1,2}:\d{2}\s?(?:AM|PM))/i.exec(label);
  return timeMatch?.[1] ?? null;
}

function lineupIds(match: LeagueMatch): string[] {
  const ids = new Set<string>();
  for (const pairing of match.pairings) {
    if (pairing.team1Player1Id) ids.add(pairing.team1Player1Id);
    if (pairing.team1Player2Id) ids.add(pairing.team1Player2Id);
    if (pairing.team2Player1Id) ids.add(pairing.team2Player1Id);
    if (pairing.team2Player2Id) ids.add(pairing.team2Player2Id);
  }
  return Array.from(ids);
}

function completedSetRows(
  match: LeagueMatch,
  displayNameMap: Map<string, string>
) {
  return buildMatchSetRows(match.pairings).map((set) => ({
    key: set.key,
    setNumber: set.setNumber,
    team1Games: set.team1Games,
    team2Games: set.team2Games,
    team1Label: `${playerName(displayNameMap, set.team1Player1Id)}${
      set.team1Player2Id ? ` & ${playerName(displayNameMap, set.team1Player2Id)}` : ""
    }`,
    team2Label: `${playerName(displayNameMap, set.team2Player1Id)}${
      set.team2Player2Id ? ` & ${playerName(displayNameMap, set.team2Player2Id)}` : ""
    }`,
  }));
}

function defaultTimeForSlot(date: Date, slotNumber: number): string {
  const weekday = date.getDay();
  if (weekday === 0 || weekday === 6) {
    return slotNumber === 1 ? "8:30 AM" : "11:00 AM";
  }
  return "5:30 PM";
}

function formatWeekRangeShort(start: Date, end: Date) {
  const monthFmt = new Intl.DateTimeFormat("en-US", { month: "short" });
  const dayFmt = new Intl.DateTimeFormat("en-US", { day: "numeric" });
  const sameMonth = monthFmt.format(start) === monthFmt.format(end);
  if (sameMonth) {
    return `${monthFmt.format(start)} ${dayFmt.format(start)} – ${dayFmt.format(end)}`;
  }
  return `${monthFmt.format(start)} ${dayFmt.format(start)} – ${monthFmt.format(end)} ${dayFmt.format(end)}`;
}

export default async function SchedulePage({ searchParams }: Readonly<PageProps>) {
  let data: Awaited<ReturnType<typeof getScheduleData>>;
  try {
    data = await getScheduleData();
  } catch {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 text-center space-y-4">
        <h1 className="font-display text-5xl tracking-widest text-(--color-clay-500)">SCHEDULE</h1>
        <p className="text-(--color-text-muted)">Data is temporarily unavailable. Please try again shortly.</p>
      </div>
    );
  }

  const { season, allMatches, allSlots, displayNameMap } = data;

  if (!season) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center text-(--color-text-muted)">
        No active season found.
      </div>
    );
  }

  const params = (await searchParams) ?? {};
  const requestedWeek = Number.parseInt(asSingle(params.week) ?? "", 10);
  const personalMode = asSingle(params.me) === "1";
  const viewerPlayerId = await getViewerPlayerId();

  const weekRanges = buildSeasonWeekRanges(season.startDate, season.endDate);
  const minWeek = 1;
  const maxWeek = Math.max(1, weekRanges.length);
  const defaultWeek = resolveRunningWeek(weekRanges, minWeek);
  const selectedWeek = Number.isFinite(requestedWeek)
    ? Math.max(minWeek, Math.min(maxWeek, requestedWeek))
    : defaultWeek;
  const selectedRange = weekRanges.find((r) => r.week === selectedWeek) ?? weekRanges[0];

  const weekMatches = selectedRange
    ? allMatches.filter((m) => {
        if (!m.slot?.slotDate) return m.weekNumber === selectedWeek;
        const date = toMidnight(parseDateInput(m.slot.slotDate));
        return isBetweenInclusive(date, selectedRange.start, selectedRange.end);
      })
    : [];

  const weekSlots = selectedRange
    ? allSlots.filter((slot) => {
        const date = toMidnight(parseDateInput(slot.slotDate));
        return isBetweenInclusive(date, selectedRange.start, selectedRange.end);
      })
    : [];

  const { slots } = selectedRange
    ? buildWeekSlotLayout(selectedRange.start, weekMatches, weekSlots)
    : { slots: [] as Array<WeekSlot<LeagueMatch>> };

  const visibleSlots = personalMode && viewerPlayerId
    ? slots.filter((slot) =>
        slot.match ? lineupIds(slot.match).includes(viewerPlayerId) : false
      )
    : slots;

  const canGoPrev = selectedWeek > minWeek;
  const canGoNext = selectedWeek < maxWeek;

  const rangeLabel = selectedRange
    ? formatWeekRangeShort(selectedRange.start, selectedRange.end)
    : "Date pending";
  const isThisWeek = selectedRange
    ? isBetweenInclusive(toMidnight(new Date()), selectedRange.start, selectedRange.end)
    : false;

  const linkBase = personalMode ? "/schedule?me=1&week=" : "/schedule?week=";

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-12 space-y-8 md:w-3/5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-5xl tracking-widest text-(--color-clay-500)">
            SCHEDULE
          </h1>
          <p className="text-sm text-(--color-text-muted) mt-1">
            {season.name} &middot; {getMatchFormatLabel()} &middot; availability window {palominoLeagueRules.availabilityWindowDays} days
          </p>
        </div>
        <PersonalToggle personalMode={personalMode} selectedWeek={selectedWeek} />
      </div>

      <div className="rounded-xl border border-(--color-border) bg-(--color-surface) px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          {canGoPrev ? (
            <Link
              href={`${linkBase}${selectedWeek - 1}`}
              className="rounded-md border border-(--color-border) px-3 py-1.5 text-sm font-semibold hover:bg-(--color-clay-50)"
            >
              ← Prev
            </Link>
          ) : (
            <span className="rounded-md border border-(--color-border) px-3 py-1.5 text-sm font-semibold text-(--color-text-muted) opacity-60">
              ← Prev
            </span>
          )}

          <div className="text-center">
            <p className="font-display text-xl tracking-wider">{rangeLabel}</p>
            {isThisWeek && (
              <p className="text-xs text-(--color-text-muted) uppercase tracking-wide">
                This Week
              </p>
            )}
          </div>

          {canGoNext ? (
            <Link
              href={`${linkBase}${selectedWeek + 1}`}
              className="rounded-md border border-(--color-border) px-3 py-1.5 text-sm font-semibold hover:bg-(--color-clay-50)"
            >
              Next →
            </Link>
          ) : (
            <span className="rounded-md border border-(--color-border) px-3 py-1.5 text-sm font-semibold text-(--color-text-muted) opacity-60">
              Next →
            </span>
          )}
        </div>
      </div>

      {personalMode && viewerPlayerId === null && (
        <p className="rounded-lg border border-(--color-border) bg-(--color-clay-50) px-4 py-3 text-sm text-(--color-text-muted)">
          Sign in with a linked player account to filter to your matches.
        </p>
      )}

      <div className="grid gap-3 lg:grid-cols-2 animate-stagger">
        {visibleSlots.length === 0 && (
          <p className="text-(--color-text-muted)">
            {personalMode ? "No personal matches this week." : "No slots configured for this week."}
          </p>
        )}
        {visibleSlots.map((slot) => (
          <ScheduleSlotCard key={slot.key} slot={slot} displayNameMap={displayNameMap} viewerPlayerId={viewerPlayerId} />
        ))}
      </div>
    </div>
  );
}

function PersonalToggle({
  personalMode,
  selectedWeek,
}: Readonly<{ personalMode: boolean; selectedWeek: number }>) {
  if (personalMode) {
    return (
      <Link
        href={`/schedule?week=${selectedWeek}`}
        className="self-start rounded-md border border-(--color-clay-500) bg-(--color-clay-500) px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90"
      >
        All matches
      </Link>
    );
  }
  return (
    <Link
      href={`/schedule?me=1&week=${selectedWeek}`}
      className="self-start rounded-md border border-(--color-border) px-3 py-1.5 text-sm font-semibold hover:bg-(--color-clay-50)"
    >
      Personal schedule
    </Link>
  );
}

function ScheduleSlotCard({
  slot,
  displayNameMap,
  viewerPlayerId,
}: Readonly<{
  slot: WeekSlot<LeagueMatch>;
  displayNameMap: Map<string, string>;
  viewerPlayerId: string | null;
}>) {
  const time = slotTimeFromLabel(slot.slotLabel) ?? defaultTimeForSlot(slot.date, slot.slotNumber);
  const dayLabel = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(slot.date);

  const match = slot.match;

  if (!match) {
    return (
      <div className="rounded-xl border border-dashed border-(--color-border) bg-(--color-surface) p-4 space-y-2 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-(--color-text-muted)">
              {dayLabel}
            </p>
            <p className="text-sm text-(--color-text-muted)">{time}</p>
          </div>
          <span className="inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600">
            No match
          </span>
        </div>
        <p className="text-sm text-(--color-text-muted)">No match scheduled</p>
      </div>
    );
  }

  return <ScheduleMatchCard match={match} time={time} dayLabel={dayLabel} displayNameMap={displayNameMap} viewerPlayerId={viewerPlayerId} />;
}

function ScheduleMatchCard({
  match,
  time,
  dayLabel,
  displayNameMap,
  viewerPlayerId,
}: Readonly<{
  match: LeagueMatch;
  time: string | null;
  dayLabel: string;
  displayNameMap: Map<string, string>;
  viewerPlayerId: string | null;
}>) {
  const lineup = lineupIds(match);
  const setRows = completedSetRows(match, displayNameMap);
  const scoreByPlayer = new Map<string, number>(
    match.status === "completed"
      ? buildMatchScorecards(match).map((sc) => [sc.playerId, sc.score])
      : []
  );

  return (
    <div className="rounded-lg border border-(--color-border) bg-(--color-surface) overflow-hidden shadow-sm transition-shadow hover:shadow-md">
      {/* Colored date strip like V1 */}
      <div className="border-b border-(--color-navy-100) border-t-2 border-t-(--color-navy-400) bg-white px-3 py-2.5 flex items-start justify-between gap-3 sm:px-4">
        <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-(--color-navy-900)">
            {match.slot?.slotDate ? formatDate(match.slot.slotDate) : dayLabel}
          </p>
          {time && <p className="text-xs text-(--color-navy-600)">{time}</p>}
        </div>
        <StatusBadge match={match} />
      </div>

      <div className="p-3 space-y-3 sm:p-4">

      {match.pairings.length > 0 ? (
        <div className="grid grid-cols-2 gap-2">
          {lineup.map((id, index) => (
            <div key={id} className="flex min-w-0 items-center justify-between rounded-md border border-(--color-navy-100) bg-(--color-navy-50) px-2 py-1.5 text-xs font-semibold sm:px-3 sm:py-2 sm:text-sm">
              <span className="min-w-0 truncate">
                <span className="mr-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-(--color-ink) text-[10px] text-white sm:mr-2">{index + 1}</span>
                {playerName(displayNameMap, id)}
              </span>
              {match.status === "completed" && (
                <span className="rounded border border-(--color-navy-200) bg-(--color-navy-100) px-1.5 py-0.5 font-display text-base tracking-wider text-(--color-navy-900)">
                  {scoreByPlayer.get(id) ?? 0}
                </span>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-(--color-text-muted)">Lineup not assigned yet.</p>
      )}

      {(match.status === "cancelled" || match.status === "abandoned") && match.abandonReason && (
        <p
          className={`rounded-lg border px-3 py-2 text-sm italic ${
            match.status === "abandoned"
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-(--color-border) bg-gray-50 text-gray-600"
          }`}
        >
          {match.abandonReason}
        </p>
      )}

      {match.status === "completed" && setRows.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-(--color-text-muted)">
            Match Results
          </p>
          {setRows.map((set) => (
            <div
              key={set.key}
              className="grid grid-cols-[1fr_auto_2.5rem_auto_1fr] items-center gap-2 rounded-md bg-(--color-forest-100) px-2 py-1.5 text-sm sm:py-2"
            >
              <span className={`font-medium ${set.team1Games > set.team2Games ? "text-(--color-forest-700) font-semibold" : "text-(--color-clay-600)"}`}>{set.team1Label}</span>
              <span className={`text-right font-semibold ${set.team1Games > set.team2Games ? "text-(--color-forest-700)" : "text-(--color-clay-600)"}`}>{set.team1Games}</span>
              <span className="text-center text-xs text-(--color-text-muted)">S{set.setNumber}</span>
              <span className={`font-semibold ${set.team2Games > set.team1Games ? "text-(--color-forest-700)" : "text-(--color-clay-600)"}`}>{set.team2Games}</span>
              <span className={`text-right font-medium ${set.team2Games > set.team1Games ? "text-(--color-forest-700) font-semibold" : "text-(--color-clay-600)"}`}>{set.team2Label}</span>
            </div>
          ))}
        </div>
      )}
      {viewerPlayerId && match.status !== "completed" && match.status !== "cancelled" && match.status !== "abandoned" && (
        <PlayerSubstituteControls matchId={match.id} viewerPlayerId={viewerPlayerId} lineupIds={lineup} />
      )}
      </div>
    </div>
  );
}

function StatusBadge({ match }: Readonly<{ match: LeagueMatch }>) {
  const status = match.status;
  const styles: Record<string, string> = {
    scheduled: "bg-(--color-clay-100) text-(--color-clay-700)",
    in_progress: "bg-yellow-100 text-yellow-700",
    completed: "bg-(--color-forest-100) text-(--color-forest-700)",
    abandoned: "bg-red-100 text-red-700",
    cancelled: "bg-gray-100 text-gray-600",
  };

  const matchNumberSuffix = match.matchNumber ? ` · Match #${match.matchNumber}` : "";
  let label: string;
  if (status === "completed") {
    label = `✓ Completed${matchNumberSuffix}`;
  } else if (status === "cancelled") {
    label = "Cancelled";
  } else if (status === "abandoned") {
    label = "Abandoned";
  } else if (status === "in_progress") {
    label = "In progress";
  } else {
    label = match.matchNumber ? `Scheduled · Match #${match.matchNumber}` : "Scheduled";
  }

  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${styles[status] ?? styles.scheduled}`}
    >
      {label}
    </span>
  );
}
