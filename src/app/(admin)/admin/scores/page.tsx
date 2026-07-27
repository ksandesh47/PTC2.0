import Link from "next/link";
import { db } from "@/db";
import { availabilitySlots, matches, playerAvailability, players, seasonPlayers, seasons } from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { formatDate } from "@/lib/utils";
import { buildMatchSetRows } from "@/lib/league/display";
import { SlotMatchActions } from "@/components/admin/SlotMatchActions";
import { AssignSlotPlayersForm } from "@/components/admin/AssignSlotPlayersForm";
import { AutoAssignButton } from "@/components/admin/AutoAssignButton";

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
  slotId?: string;
  slotLabel?: string;
  match?: T;
};

type SlotRow = {
  id: string;
  label: string;
  slotDate: string | Date;
};

function buildWeekSlotLayout<T extends { id: string; slot?: { slotDate: string | Date } | null }>(
  weekStart: Date,
  rows: T[],
  slotRows: SlotRow[]
): { slots: Array<WeekSlot<T>>; selectedMatches: T[] } {
  const buckets = new Map<string, T[]>();
  const slotBuckets = new Map<string, SlotRow[]>();

  for (const row of rows) {
    if (!row.slot?.slotDate) continue;
    const date = toMidnight(parseDateInput(row.slot.slotDate));
    const key = slotDateKey(date);
    const list = buckets.get(key) ?? [];
    list.push(row);
    buckets.set(key, list);
  }

  for (const row of slotRows) {
    const date = toMidnight(parseDateInput(row.slotDate));
    const key = slotDateKey(date);
    const list = slotBuckets.get(key) ?? [];
    list.push(row);
    slotBuckets.set(key, list);
  }

  const slots: Array<WeekSlot<T>> = [];
  for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
    const date = addDays(weekStart, dayIndex);
    const weekday = date.getDay();
    const maxSlots = weekday === 0 || weekday === 6 ? 2 : 1;
    const key = slotDateKey(date);
    const dayMatches = buckets.get(key) ?? [];
    const daySlots = slotBuckets.get(key) ?? [];
    const dayLabel = new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(date).toUpperCase();

    for (let slotNumber = 1; slotNumber <= maxSlots; slotNumber += 1) {
      const slotMeta = daySlots[slotNumber - 1];
      slots.push({
        key: `${key}-${slotNumber}`,
        date,
        dayLabel,
        slotNumber,
        slotId: slotMeta?.id,
        slotLabel: slotMeta?.label,
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

  return weekRanges.at(-1)!.week;
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

  const playerById = new Map(
    match.pairings.flatMap((pairing) => [
      pairing.team1Player1 ? [[pairing.team1Player1.id, pairing.team1Player1] as const] : [],
      pairing.team1Player2 ? [[pairing.team1Player2.id, pairing.team1Player2] as const] : [],
      pairing.team2Player1 ? [[pairing.team2Player1.id, pairing.team2Player1] as const] : [],
      pairing.team2Player2 ? [[pairing.team2Player2.id, pairing.team2Player2] as const] : [],
    ]).flat()
  );

  const pairingsForRows = match.pairings.map((pairing) => ({
    id: pairing.id,
    team1Player1Id: pairing.team1Player1?.id ?? null,
    team1Player2Id: pairing.team1Player2?.id ?? null,
    team2Player1Id: pairing.team2Player1?.id ?? null,
    team2Player2Id: pairing.team2Player2?.id ?? null,
    sets: pairing.sets,
  }));

  return buildMatchSetRows(pairingsForRows)
    .map((set) => {
      const p1 = set.team1Player1Id ? playerById.get(set.team1Player1Id) : undefined;
      const p2 = set.team1Player2Id ? playerById.get(set.team1Player2Id) : undefined;
      const p3 = set.team2Player1Id ? playerById.get(set.team2Player1Id) : undefined;
      const p4 = set.team2Player2Id ? playerById.get(set.team2Player2Id) : undefined;
      if (!p1 || !p2 || !p3 || !p4) return null;

      return cardFromPairing({
        pairingId: set.pairingId,
        setNumber: set.setNumber,
        team1Player1: p1,
        team1Player2: p2,
        team2Player1: p3,
        team2Player2: p4,
        team1Games: set.team1Games,
        team2Games: set.team2Games,
      });
    })
    .filter((card): card is SetCard => !!card);
}

function getInitialAssignment(match: {
  pairings: Array<{
    team1Player1?: { id: string } | null;
    team1Player2?: { id: string } | null;
    team2Player1?: { id: string } | null;
    team2Player2?: { id: string } | null;
  }>;
}) {
  const firstPairing = match.pairings[0];
  if (!firstPairing) return null;

  const p1 = firstPairing.team1Player1?.id;
  const p2 = firstPairing.team1Player2?.id;
  const p3 = firstPairing.team2Player1?.id;
  const p4 = firstPairing.team2Player2?.id;
  if (!p1 || !p2 || !p3 || !p4) return null;

  return {
    team1Player1Id: p1,
    team1Player2Id: p2,
    team2Player1Id: p3,
    team2Player2Id: p4,
  };
}

export default async function AdminScoresPage({ searchParams }: Readonly<PageProps>) {
  try {
  const activeSeason = await db.query.seasons.findFirst({ where: eq(seasons.isActive, true) });

  if (!activeSeason) {
    return (
      <div className="p-6 lg:p-8 max-w-5xl">
        <h1 className="font-display text-4xl tracking-widest text-(--color-clay-500)">SCORE ENTRY</h1>
        <p className="mt-3 text-sm text-(--color-text-muted)">No active season configured.</p>
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

  const slotRows = await db.query.availabilitySlots.findMany({
    where: eq(availabilitySlots.seasonId, activeSeason.id),
    orderBy: (t, { asc }) => [asc(t.slotDate), asc(t.createdAt)],
  });

  const enrolledPlayers = await db
    .select({
      id: players.id,
      firstName: players.firstName,
      lastName: players.lastName,
    })
    .from(seasonPlayers)
    .innerJoin(players, eq(players.id, seasonPlayers.playerId))
    .where(and(eq(seasonPlayers.seasonId, activeSeason.id), eq(players.isActive, true)));

  // Games-played per player: distinct non-cancelled matches for the active season
  const gamesPlayedByPlayer = new Map<string, number>();
  const playedSet = new Set<string>();
  for (const match of matchRows) {
    if (match.status === "cancelled" || match.status === "abandoned") continue;
    for (const pairing of match.pairings) {
      for (const p of [pairing.team1Player1, pairing.team1Player2, pairing.team2Player1, pairing.team2Player2]) {
        if (!p) continue;
        const key = `${p.id}|${match.id}`;
        if (playedSet.has(key)) continue;
        playedSet.add(key);
        gamesPlayedByPlayer.set(p.id, (gamesPlayedByPlayer.get(p.id) ?? 0) + 1);
      }
    }
  }

  // Availability per slot, keyed by "slotId|playerId"
  const slotIdList = slotRows.map((s) => s.id);
  const availabilityRows =
    slotIdList.length > 0
      ? await db
          .select({
            slotId: playerAvailability.slotId,
            playerId: playerAvailability.playerId,
            status: playerAvailability.status,
          })
          .from(playerAvailability)
          .where(inArray(playerAvailability.slotId, slotIdList))
      : [];

  const availabilityBySlotPlayer = new Map<string, "available" | "maybe" | "unavailable">();
  const availableCountBySlot = new Map<string, number>();
  for (const row of availabilityRows) {
    availabilityBySlotPlayer.set(`${row.slotId}|${row.playerId}`, row.status);
    if (row.status === "available" || row.status === "maybe") {
      availableCountBySlot.set(row.slotId, (availableCountBySlot.get(row.slotId) ?? 0) + 1);
    }
  }

  function pickerPlayersForSlot(slotId: string | undefined) {
    return enrolledPlayers.map((player) => ({
      id: player.id,
      name: `${player.firstName} ${player.lastName}`,
      gamesPlayed: gamesPlayedByPlayer.get(player.id) ?? 0,
      availability: slotId
        ? (availabilityBySlotPlayer.get(`${slotId}|${player.id}`) ?? null)
        : null,
    }));
  }

  function slotHeaderFor(slotDate: Date | string | undefined, slotLabel: string | undefined) {
    if (!slotDate) return slotLabel ?? "Select exactly 4";
    const dayShort = new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(parseDateInput(slotDate));
    const time = slotLabel?.split(" - ")[1] ?? "";
    const timePart = time ? ` · ${time}` : "";
    return `${dayShort}${timePart} · Select exactly 4`;
  }

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

  const selectedWeekSlots = selectedWeekRange
    ? slotRows.filter((slot) => {
        const slotDate = toMidnight(parseDateInput(slot.slotDate));
        return isBetweenInclusive(slotDate, selectedWeekRange.start, selectedWeekRange.end);
      })
    : [];

  const slotLayout = selectedWeekRange
    ? buildWeekSlotLayout(selectedWeekRange.start, weekRows, selectedWeekSlots)
    : {
        slots: [] as Array<WeekSlot<(typeof weekRows)[number]>>,
        selectedMatches: [] as typeof weekRows,
      };
  const displayWeekMatches = slotLayout.selectedMatches;

  const setCountByMatch = buildSetCountByMatch(displayWeekMatches);

  const readyForScoring = displayWeekMatches.filter((m) => m.status === "scheduled" || m.status === "in_progress");

  // Season-wide canceled matches retrospective (bottom of page)
  const canceledMatches = matchRows
    .filter((m) => m.status === "cancelled" || m.status === "abandoned")
    .sort((a, b) => {
      const da = a.slot?.slotDate ? new Date(a.slot.slotDate).getTime() : 0;
      const db = b.slot?.slotDate ? new Date(b.slot.slotDate).getTime() : 0;
      return db - da;
    });

  // Past scheduled matches missing scores (for header banner)
  const today = toMidnight(new Date());
  const pastMissingScores = matchRows.filter((m) => {
    if (m.status !== "scheduled" && m.status !== "in_progress") return false;
    if (!m.slot?.slotDate) return false;
    const slotDate = toMidnight(parseDateInput(m.slot.slotDate));
    if (slotDate.getTime() >= today.getTime()) return false;
    return (setCountByMatch.get(m.id) ?? buildSetCountByMatch([m]).get(m.id) ?? 0) === 0;
  });

  return (
    <div className="p-6 lg:p-8 max-w-6xl space-y-6">
      <div>
        <h1 className="font-display text-4xl tracking-widest text-(--color-clay-500)">SCORE ENTRY</h1>
        <p className="mt-1 text-sm text-(--color-text-muted)">
          {activeSeason.name} · Week {selectedWeek} of {maxWeek} · {displayWeekMatches.length}/9 matches · {readyForScoring.length} pending
        </p>
      </div>

      {selectedWeekRange && (
        <div className="rounded-xl border border-(--color-border) bg-(--color-surface) px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            {canGoPrev ? (
              <Link
                href={`/admin/scores?week=${selectedWeek - 1}`}
                className="rounded-md border border-(--color-border) px-3 py-1.5 text-sm font-semibold hover:bg-(--color-clay-50)"
              >
                ← Prev
              </Link>
            ) : (
              <span className="rounded-md border border-(--color-border) px-3 py-1.5 text-sm font-semibold text-(--color-text-muted) opacity-60">
                ← Prev
              </span>
            )}

            <p className="text-center font-display text-lg tracking-wider">
              {weekRangeLabel(selectedWeekRange.start, selectedWeekRange.end)}
            </p>

            {canGoNext ? (
              <Link
                href={`/admin/scores?week=${selectedWeek + 1}`}
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
      )}

      <div className="flex flex-wrap gap-3 text-sm">
        <Link href="/results" className="rounded-md border border-(--color-border) px-3 py-1.5 font-semibold hover:bg-(--color-clay-50)">
          Open Results
        </Link>
        <Link href="/admin/matches" className="rounded-md border border-(--color-border) px-3 py-1.5 font-semibold hover:bg-(--color-clay-50)">
          Review Match Assignments
        </Link>
      </div>

      {pastMissingScores.length > 0 && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm">
          <p className="font-semibold text-yellow-800">
            Past Scheduled Matches Missing Scores: {pastMissingScores.length}
          </p>
          <ul className="mt-1 text-xs text-yellow-800/80 space-y-0.5">
            {pastMissingScores.slice(0, 5).map((m) => (
              <li key={m.id}>
                {m.slot?.slotDate ? formatDate(m.slot.slotDate) : "?"} · {m.slot?.label ?? m.court ?? "?"}
                {m.matchNumber ? ` · Match #${m.matchNumber}` : ""}
              </li>
            ))}
            {pastMissingScores.length > 5 && (
              <li>… and {pastMissingScores.length - 5} more</li>
            )}
          </ul>
        </div>
      )}

      {displayWeekMatches.length > 0 && (
        <div className="flex flex-wrap gap-1 rounded-lg border border-(--color-border) bg-(--color-surface) p-2 text-xs">
          {slotLayout.slots.map((slot) => {
            const match = slot.match;
            const scored = match ? (setCountByMatch.get(match.id) ?? 0) > 0 : false;
            const isCancelled = match?.status === "cancelled" || match?.status === "abandoned";
            let chipStyle: string;
            if (isCancelled) chipStyle = "bg-red-50 text-red-700 border-red-200";
            else if (scored) chipStyle = "bg-(--color-forest-100) text-(--color-forest-700) border-(--color-forest-200)";
            else chipStyle = "border-(--color-border) hover:bg-(--color-clay-50)";
            const monthDay = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(slot.date);
            let suffix = "";
            if (scored) suffix = " ✓";
            else if (isCancelled) suffix = " • Canceled";
            else if (match) suffix = " ·";
            return (
              <a
                key={slot.key}
                href={match ? `#match-${match.id}` : `#slot-${slot.key}`}
                className={`rounded border px-2 py-1 font-semibold transition-colors ${chipStyle}`}
              >
                {slot.dayLabel} {monthDay}{suffix}
              </a>
            );
          })}
        </div>
      )}

      <section className="space-y-3">
        <h2 className="font-display text-2xl tracking-wider">THIS WEEK'S SLOTS</h2>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {slotLayout.slots.map((slot) => {
            const match = slot.match;
            const slotLabel = `${slot.dayLabel} SLOT ${slot.slotNumber}`;
            const scoredSetCount = match ? (setCountByMatch.get(match.id) ?? 0) : 0;
            const scoredSets = match && scoredSetCount > 0 ? buildSetCards(match) : [];
            const availableCount = slot.slotId ? (availableCountBySlot.get(slot.slotId) ?? 0) : 0;
            let scoringSummary = "No players assigned";
            if (scoredSetCount > 0) {
              scoringSummary = `${scoredSetCount} sets scored`;
            } else if (match && match.pairings.length > 0) {
              scoringSummary = "Players assigned - awaiting scores";
            }
            const anchorId = match ? `match-${match.id}` : `slot-${slot.key}`;
            const slotTimeLabel = slot.slotLabel?.split(" - ")[1];
            return (
              <article
                key={slot.key}
                id={anchorId}
                className="rounded-lg border border-(--color-border) bg-(--color-surface) p-3 space-y-2 scroll-mt-24"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider">{slotLabel}</p>
                    <p className="text-sm font-semibold">{formatDate(slot.date)}{slotTimeLabel ? ` · ${slotTimeLabel}` : ""}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {match?.matchNumber ? (
                      <span className="whitespace-nowrap rounded-full bg-(--color-clay-100) px-2 py-0.5 text-xs font-semibold text-(--color-clay-700)">
                        Match #{match.matchNumber}
                      </span>
                    ) : null}
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-(--color-text-muted)">
                      {availableCount} available
                    </span>
                    {match ? (
                      <p className="text-xs font-semibold uppercase tracking-wider text-(--color-clay-600)">
                        {match.status.replace("_", " ")}
                      </p>
                    ) : (
                      <p className="text-xs font-semibold uppercase tracking-wider text-(--color-text-muted)">Open</p>
                    )}
                  </div>
                </div>
                {match ? (
                  <>
                    <p className="text-xs text-(--color-text-muted)">{match.slot?.label ?? match.court ?? "Court TBD"}</p>
                    <p className="text-xs">{scoringSummary}</p>
                    {scoredSets.length > 0 && (
                      <div className="space-y-1 pt-1">
                        {scoredSets.map((set) => (
                          <div key={set.setNumber} className="rounded border border-(--color-border) px-2 py-1 text-xs">
                            <p className="font-semibold uppercase tracking-wider text-(--color-text-muted)">Set {set.setNumber}</p>
                            <div className="grid grid-cols-[1fr_auto_auto_1fr] items-center gap-1">
                              <span className="font-semibold truncate">{set.team1Label}</span>
                              <span className="font-semibold text-(--color-clay-600)">{set.team1Games}</span>
                              <span className="font-semibold text-(--color-clay-600)">{set.team2Games}</span>
                              <span className="font-semibold truncate text-right">{set.team2Label}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {(match.status === "cancelled" || match.status === "abandoned") && (
                      <p className="text-xs font-semibold uppercase tracking-wider text-red-600">
                        Match {match.status}{match.abandonReason ? `: ${match.abandonReason}` : ""}
                      </p>
                    )}
                    <SlotMatchActions
                      matchId={match.id}
                      matchStatus={match.status}
                      initialSetCards={buildSetCards(match)}
                      currentAbandonReason={match.abandonReason}
                      compact
                    />
                    {match.slotId && (
                      <AssignSlotPlayersForm
                        slotId={match.slotId}
                        slotHeader={slotHeaderFor(slot.date, slot.slotLabel)}
                        matchId={match.id}
                        players={pickerPlayersForSlot(match.slotId)}
                        initialAssignment={getInitialAssignment(match)}
                        disabled={scoredSetCount > 0}
                        disabledMessage="Scored matches cannot be reassigned."
                      />
                    )}
                  </>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-(--color-text-muted)">No match created for this slot yet.</p>
                    {slot.slotId ? (
                      <>
                        <AutoAssignButton
                          slotId={slot.slotId}
                          availableCount={availableCountBySlot.get(slot.slotId) ?? 0}
                        />
                        <AssignSlotPlayersForm
                          slotId={slot.slotId}
                          slotHeader={slotHeaderFor(slot.date, slot.slotLabel)}
                          players={pickerPlayersForSlot(slot.slotId)}
                        />
                      </>
                    ) : (
                      <p className="text-xs text-(--color-text-muted)">No availability slot exists yet for assignment.</p>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>

        {displayWeekMatches.every((m) => (setCountByMatch.get(m.id) ?? 0) === 0) && (
          <p className="text-sm text-(--color-text-muted)">No scored matches yet.</p>
        )}
      </section>

      {canceledMatches.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl tracking-wider">CANCELED MATCHES</h2>
            <span className="text-xs font-semibold text-(--color-text-muted)">
              {canceledMatches.length} canceled
            </span>
          </div>
          <div className="rounded-lg border border-(--color-border) bg-(--color-surface) divide-y divide-(--color-border)">
            {canceledMatches.map((m) => {
              const lineup = m.pairings.flatMap((p) => [p.team1Player1, p.team1Player2, p.team2Player1, p.team2Player2])
                .filter((p): p is NonNullable<typeof p> => !!p);
              const names = [...new Set(lineup.map((p) => p.firstName))].join(" · ");
              return (
                <div key={m.id} className="px-4 py-3 space-y-1">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold">
                      {m.slot?.slotDate ? formatDate(m.slot.slotDate) : "Date pending"}
                      {m.slot?.label ? ` · ${m.slot.label.split(" - ")[1] ?? m.slot.label}` : ""}
                    </p>
                    <SlotMatchActions
                      matchId={m.id}
                      matchStatus={m.status}
                      initialSetCards={buildSetCards(m)}
                      currentAbandonReason={m.abandonReason}
                      compact
                    />
                  </div>
                  {names && <p className="text-xs text-(--color-text-muted)">{names}</p>}
                  {m.abandonReason && (
                    <p className="text-xs text-red-700">Reason: {m.abandonReason}</p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
  } catch {
    return (
      <div className="p-6 lg:p-8 max-w-5xl space-y-3">
        <h1 className="font-display text-4xl tracking-widest text-(--color-clay-500)">SCORE ENTRY</h1>
        <p className="text-sm text-(--color-text-muted)">
          Data is temporarily unavailable. Please refresh or try again in a moment.
        </p>
        <div className="flex flex-wrap gap-3 text-sm">
          <Link href="/admin" className="rounded-md border border-(--color-border) px-3 py-1.5 font-semibold hover:bg-(--color-clay-50)">
            Back to Dashboard
          </Link>
          <Link href="/schedule" className="rounded-md border border-(--color-border) px-3 py-1.5 font-semibold hover:bg-(--color-clay-50)">
            Open Public Schedule
          </Link>
        </div>
      </div>
    );
  }
}
