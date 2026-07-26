import Link from "next/link";
import { db } from "@/db";
import { matches, seasons } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { formatDate } from "@/lib/utils";
import { ScoreEntryForm } from "@/components/admin/ScoreEntryForm";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type SetCard = {
  pairingId?: string;
  setNumber: number;
  team1Label: string;
  team2Label: string;
  team1Player1Id: string;
  team1Player2Id: string;
  team2Player1Id: string;
  team2Player2Id: string;
  team1Games: number;
  team2Games: number;
};

function playerPairLabel(p1?: { firstName: string } | null, p2?: { firstName: string } | null) {
  return `${p1?.firstName ?? 'TBD'} & ${p2?.firstName ?? 'TBD'}`;
}

function asSingle(value: string | string[] | undefined) {
  if (!value) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

function parseDateInput(value: string | Date): Date {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1);
  }
  return new Date(value);
}

function addDays(base: Date, days: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

function startOfWeekMonday(date: Date) {
  const d = toMidnight(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  return addDays(d, diff);
}

function endOfWeekSunday(date: Date) {
  const monday = startOfWeekMonday(date);
  return addDays(monday, 6);
}

function weekRangeLabel(start: Date, end: Date) {
  return `${formatDate(start)} - ${formatDate(end)}`;
}

function isBetweenInclusive(date: Date, start: Date, end: Date) {
  return date.getTime() >= start.getTime() && date.getTime() <= end.getTime();
}

function toMidnight(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function slotDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

type WeekSlot<T> = {
  key: string;
  date: Date;
  dayLabel: string;
  slotNumber: number;
  match?: T;
};

function buildWeekSlotLayout<T extends { id: string; slot?: { slotDate: string | Date } | null }>(
  weekStart: Date,
  rows: T[]
): { slots: Array<WeekSlot<T>>; selectedMatches: T[] } {
  const buckets = new Map<string, T[]>();
  for (const row of rows) {
    if (!row.slot?.slotDate) continue;
    const date = toMidnight(parseDateInput(row.slot.slotDate));
    const key = slotDateKey(date);
    const list = buckets.get(key) ?? [];
    list.push(row);
    buckets.set(key, list);
  }

  const slots: Array<WeekSlot<T>> = [];
  for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
    const date = addDays(weekStart, dayIndex);
    const weekday = date.getDay();
    const maxSlots = weekday === 0 || weekday === 6 ? 2 : 1;
    const key = slotDateKey(date);
    const dayMatches = buckets.get(key) ?? [];
    const dayLabel = new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(date).toUpperCase();

    for (let slotNumber = 1; slotNumber <= maxSlots; slotNumber += 1) {
      slots.push({
        key: `${key}-${slotNumber}`,
        date,
        dayLabel,
        slotNumber,
        match: dayMatches[slotNumber - 1],
      });
    }
  }

  const selectedMatches = slots
    .map((slot) => slot.match)
    .filter((match): match is T => !!match);

  return { slots, selectedMatches };
}

function buildSeasonWeekRanges(startDate: string | Date, endDate: string | Date) {
  const seasonStart = startOfWeekMonday(parseDateInput(startDate));
  const seasonEnd = endOfWeekSunday(parseDateInput(endDate));
  const weekRanges: Array<{ week: number; start: Date; end: Date }> = [];

  let cursor = seasonStart;
  let weekCounter = 1;
  while (cursor.getTime() <= seasonEnd.getTime()) {
    const weekStart = cursor;
    const rawWeekEnd = addDays(weekStart, 6);
    const weekEnd = rawWeekEnd.getTime() > seasonEnd.getTime() ? seasonEnd : rawWeekEnd;
    weekRanges.push({ week: weekCounter, start: weekStart, end: weekEnd });
    cursor = addDays(weekStart, 7);
    weekCounter += 1;
  }

  return weekRanges;
}

function resolveRunningWeek(
  weekRanges: Array<{ week: number; start: Date; end: Date }>,
  fallbackWeek: number
) {
  if (weekRanges.length === 0) return fallbackWeek;

  const today = toMidnight(new Date());
  const activeWeek = weekRanges.find((range) => isBetweenInclusive(today, range.start, range.end));
  if (activeWeek) return activeWeek.week;

  if (today.getTime() < weekRanges[0].start.getTime()) {
    return weekRanges[0].week;
  }

  return weekRanges[weekRanges.length - 1].week;
}

function buildSetCountByMatch<T extends { id: string; pairings: Array<{ sets: Array<{ version: number }> }> }>(rows: T[]) {
  const setCountByMatch = new Map<string, number>();
  for (const match of rows) {
    let count = 0;
    for (const pairing of match.pairings) {
      const newestVersion = pairing.sets[0]?.version;
      if (!newestVersion) continue;
      count += pairing.sets.filter((s) => s.version === newestVersion).length;
    }
    setCountByMatch.set(match.id, count);
  }
  return setCountByMatch;
}

function buildSetCards(match: {
  pairings: Array<{
    id: string;
    team1Player1?: { id: string; firstName: string } | null;
    team1Player2?: { id: string; firstName: string } | null;
    team2Player1?: { id: string; firstName: string } | null;
    team2Player2?: { id: string; firstName: string } | null;
    sets: Array<{
      setNumber: number;
      team1Games: number;
      team2Games: number;
      version: number;
    }>;
  }>;
}): SetCard[] {
  function cardFromPairing(input: {
    pairingId?: string;
    setNumber: number;
    team1Player1: { id: string; firstName: string };
    team1Player2: { id: string; firstName: string };
    team2Player1: { id: string; firstName: string };
    team2Player2: { id: string; firstName: string };
    team1Games: number;
    team2Games: number;
  }): SetCard {
    return {
      pairingId: input.pairingId,
      setNumber: input.setNumber,
      team1Label: playerPairLabel(input.team1Player1, input.team1Player2),
      team2Label: playerPairLabel(input.team2Player1, input.team2Player2),
      team1Player1Id: input.team1Player1.id,
      team1Player2Id: input.team1Player2.id,
      team2Player1Id: input.team2Player1.id,
      team2Player2Id: input.team2Player2.id,
      team1Games: input.team1Games,
      team2Games: input.team2Games,
    };
  }

  const hasRecordedSets = match.pairings.some((pairing) => pairing.sets.length > 0);

  if (!hasRecordedSets) {
    if (match.pairings.length === 1) {
      const pairing = match.pairings[0];
      const p1 = pairing.team1Player1;
      const p2 = pairing.team1Player2;
      const p3 = pairing.team2Player1;
      const p4 = pairing.team2Player2;

      if (p1 && p2 && p3 && p4) {
        return [
          cardFromPairing({
            setNumber: 1,
            team1Player1: p1,
            team1Player2: p2,
            team2Player1: p3,
            team2Player2: p4,
            team1Games: 0,
            team2Games: 0,
          }),
          cardFromPairing({
            setNumber: 2,
            team1Player1: p1,
            team1Player2: p3,
            team2Player1: p2,
            team2Player2: p4,
            team1Games: 0,
            team2Games: 0,
          }),
          cardFromPairing({
            setNumber: 3,
            team1Player1: p1,
            team1Player2: p4,
            team2Player1: p2,
            team2Player2: p3,
            team1Games: 0,
            team2Games: 0,
          }),
        ];
      }

      if (!p1 || !p2 || !p3 || !p4) return [];

      return [1, 2, 3].map((setNumber) =>
        cardFromPairing({
          pairingId: pairing.id,
          setNumber,
          team1Player1: p1,
          team1Player2: p2,
          team2Player1: p3,
          team2Player2: p4,
          team1Games: 0,
          team2Games: 0,
        })
      );
    }

    return match.pairings
      .map((pairing, index) => {
        const p1 = pairing.team1Player1;
        const p2 = pairing.team1Player2;
        const p3 = pairing.team2Player1;
        const p4 = pairing.team2Player2;
        if (!p1 || !p2 || !p3 || !p4) return null;
        return cardFromPairing({
          pairingId: pairing.id,
          setNumber: index + 1,
          team1Player1: p1,
          team1Player2: p2,
          team2Player1: p3,
          team2Player2: p4,
          team1Games: 0,
          team2Games: 0,
        });
      })
      .filter((card): card is SetCard => !!card);
  }

  const cards = match.pairings.flatMap((pairing, pairingIndex) => {
    const newestVersion = pairing.sets[0]?.version;
    if (!newestVersion) return [];

    const latestSets = pairing.sets
      .filter((set) => set.version === newestVersion)
      .sort((a, b) => a.setNumber - b.setNumber);

    const p1 = pairing.team1Player1;
    const p2 = pairing.team1Player2;
    const p3 = pairing.team2Player1;
    const p4 = pairing.team2Player2;
    if (!p1 || !p2 || !p3 || !p4) return [];

    return latestSets.map((set) =>
      cardFromPairing({
        pairingId: pairing.id,
        setNumber: latestSets.length === 1 && match.pairings.length > 1 ? pairingIndex + 1 : set.setNumber,
        team1Player1: p1,
        team1Player2: p2,
        team2Player1: p3,
        team2Player2: p4,
        team1Games: set.team1Games,
        team2Games: set.team2Games,
      })
    );
  });

  return cards.sort((a, b) => a.setNumber - b.setNumber);
}

export default async function AdminScoresPage({ searchParams }: Readonly<PageProps>) {
  const activeSeason = await db.query.seasons.findFirst({ where: eq(seasons.isActive, true) });

  if (!activeSeason) {
    return (
      <div className="p-6 lg:p-8 max-w-5xl">
        <h1 className="font-display text-4xl tracking-widest text-[--color-clay-500]">SCORE ENTRY</h1>
        <p className="mt-3 text-sm text-[--color-text-muted]">No active season configured.</p>
      </div>
    );
  }

  const matchRows = await db.query.matches.findMany({
    where: and(eq(matches.seasonId, activeSeason.id)),
    with: {
      slot: true,
      pairings: {
        with: {
          team1Player1: true,
          team1Player2: true,
          team2Player1: true,
          team2Player2: true,
          sets: {
            orderBy: (t, { desc }) => [desc(t.version), desc(t.recordedAt)],
          },
        },
      },
    },
    orderBy: (t, { asc }) => [asc(t.weekNumber), asc(t.createdAt)],
  });

  const params = (await searchParams) ?? {};
  const requestedWeek = Number.parseInt(asSingle(params.week) ?? "", 10);

  const weekRanges = buildSeasonWeekRanges(activeSeason.startDate, activeSeason.endDate);

  const minWeek = 1;
  const maxWeek = Math.max(1, weekRanges.length);
  const defaultRunningWeek = resolveRunningWeek(weekRanges, minWeek);
  const selectedWeek = Number.isFinite(requestedWeek)
    ? Math.max(minWeek, Math.min(maxWeek, requestedWeek))
    : defaultRunningWeek;
  const selectedWeekRange = weekRanges.find((entry) => entry.week === selectedWeek) ?? weekRanges[0];
  const canGoPrev = selectedWeek > minWeek;
  const canGoNext = selectedWeek < maxWeek;

  const weekRows = selectedWeekRange
    ? matchRows.filter((m) => {
        if (m.slot?.slotDate) {
          const slotDate = toMidnight(parseDateInput(m.slot.slotDate));
          return isBetweenInclusive(slotDate, selectedWeekRange.start, selectedWeekRange.end);
        }
        return m.weekNumber === selectedWeek;
      })
    : [];

  const slotLayout = selectedWeekRange
    ? buildWeekSlotLayout(selectedWeekRange.start, weekRows)
    : {
        slots: [] as Array<WeekSlot<(typeof weekRows)[number]>>,
        selectedMatches: [] as typeof weekRows,
      };
  const displayWeekMatches = slotLayout.selectedMatches;

  const setCountByMatch = buildSetCountByMatch(displayWeekMatches);

  const readyForScoring = displayWeekMatches.filter((m) => m.status === "scheduled" || m.status === "in_progress");
  let pendingSectionContent;
  if (displayWeekMatches.length === 0) {
    pendingSectionContent = (
      <p className="text-sm text-[--color-text-muted]">No matches fall within this week range.</p>
    );
  } else if (readyForScoring.length === 0) {
    pendingSectionContent = (
      <p className="text-sm text-[--color-text-muted]">No scheduled or in-progress matches right now.</p>
    );
  } else {
    pendingSectionContent = (
      <div className="grid gap-4">
        {readyForScoring.map((m) => {
          if (m.pairings.length === 0) return null;
          const initialSetCards = buildSetCards(m);

          return (
            <article key={m.id} className="rounded-xl border border-[--color-border] bg-[--color-surface] p-4 shadow-sm space-y-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[--color-text-muted]">{m.slot?.slotDate ? formatDate(m.slot.slotDate) : "Date pending"}</p>
                <p className="text-sm text-[--color-text-muted] mt-1">{m.slot?.label ?? m.court ?? "Court TBD"}</p>
                <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-[--color-clay-600]">
                  Status: {m.status.replace("_", " ")}
                </p>
              </div>
              <ScoreEntryForm matchId={m.id} initialSetCards={initialSetCards} />
            </article>
          );
        })}
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-6xl space-y-6">
      <div>
        <h1 className="font-display text-4xl tracking-widest text-[--color-clay-500]">SCORE ENTRY</h1>
        <p className="mt-1 text-sm text-[--color-text-muted]">
          {activeSeason.name} · Week {selectedWeek} of {maxWeek} · {displayWeekMatches.length}/9 matches · {readyForScoring.length} pending
        </p>
      </div>

      {selectedWeekRange && (
        <div className="rounded-xl border border-[--color-border] bg-[--color-surface] px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            {canGoPrev ? (
              <Link
                href={`/admin/scores?week=${selectedWeek - 1}`}
                className="rounded-md border border-[--color-border] px-3 py-1.5 text-sm font-semibold hover:bg-[--color-clay-50]"
              >
                ← Prev
              </Link>
            ) : (
              <span className="rounded-md border border-[--color-border] px-3 py-1.5 text-sm font-semibold text-[--color-text-muted] opacity-60">
                ← Prev
              </span>
            )}

            <p className="text-center font-display text-lg tracking-wider">
              {weekRangeLabel(selectedWeekRange.start, selectedWeekRange.end)}
            </p>

            {canGoNext ? (
              <Link
                href={`/admin/scores?week=${selectedWeek + 1}`}
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

      <div className="flex flex-wrap gap-3 text-sm">
        <Link href="/results" className="rounded-md border border-[--color-border] px-3 py-1.5 font-semibold hover:bg-[--color-clay-50]">
          Open Results
        </Link>
        <Link href="/admin/matches" className="rounded-md border border-[--color-border] px-3 py-1.5 font-semibold hover:bg-[--color-clay-50]">
          Review Match Assignments
        </Link>
      </div>

      <section className="space-y-3">
        <h2 className="font-display text-2xl tracking-wider">PENDING SCORES</h2>
        {pendingSectionContent}
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-2xl tracking-wider">RECENTLY SCORED</h2>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {slotLayout.slots.map((slot) => {
            const match = slot.match;
            const slotLabel = `${slot.dayLabel} SLOT ${slot.slotNumber}`;
            const scoredSetCount = match ? (setCountByMatch.get(match.id) ?? 0) : 0;
            const scoredSets = match && scoredSetCount > 0 ? buildSetCards(match) : [];
            return (
              <article key={slot.key} className="rounded-lg border border-[--color-border] bg-[--color-surface] p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wider">{slotLabel}</p>
                  {match ? (
                    <p className="text-xs font-semibold uppercase tracking-wider text-[--color-clay-600]">{match.status.replace("_", " ")}</p>
                  ) : (
                    <p className="text-xs font-semibold uppercase tracking-wider text-[--color-text-muted]">Open</p>
                  )}
                </div>
                <p className="text-sm font-semibold">{formatDate(slot.date)}</p>
                {match ? (
                  <>
                    <p className="text-xs text-[--color-text-muted]">{match.slot?.label ?? match.court ?? "Court TBD"}</p>
                    <p className="text-xs">
                      {scoredSetCount > 0
                        ? `${scoredSetCount} sets scored`
                        : match.pairings.length > 0
                          ? "Players assigned - awaiting scores"
                          : "No players assigned"}
                    </p>
                    {scoredSets.length > 0 && (
                      <div className="space-y-1 pt-1">
                        {scoredSets.map((set) => (
                          <div key={set.setNumber} className="rounded border border-[--color-border] px-2 py-1 text-xs">
                            <p className="font-semibold uppercase tracking-wider text-[--color-text-muted]">Set {set.setNumber}</p>
                            <div className="grid grid-cols-[1fr_auto_auto_1fr] items-center gap-1">
                              <span className="font-semibold truncate">{set.team1Label}</span>
                              <span className="font-semibold text-[--color-clay-600]">{set.team1Games}</span>
                              <span className="font-semibold text-[--color-clay-600]">{set.team2Games}</span>
                              <span className="font-semibold truncate text-right">{set.team2Label}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {match.status === "cancelled" && (
                      <p className="text-xs font-semibold uppercase tracking-wider text-red-600">Match cancelled</p>
                    )}
                  </>
                ) : (
                  <p className="text-xs text-[--color-text-muted]">No match created for this slot yet.</p>
                )}
              </article>
            );
          })}
        </div>

        {displayWeekMatches.every((m) => (setCountByMatch.get(m.id) ?? 0) === 0) && (
          <p className="text-sm text-[--color-text-muted]">No scored matches yet.</p>
        )}
      </section>
    </div>
  );
}
