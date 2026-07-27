// Shared week/slot utilities used by both admin and public schedule views.

export function parseDateInput(value: string | Date): Date {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1);
  }
  return new Date(value);
}

export function addDays(base: Date, days: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

export function toMidnight(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function startOfWeekMonday(date: Date) {
  const d = toMidnight(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  return addDays(d, diff);
}

export function endOfWeekSunday(date: Date) {
  return addDays(startOfWeekMonday(date), 6);
}

export function isBetweenInclusive(date: Date, start: Date, end: Date) {
  return date.getTime() >= start.getTime() && date.getTime() <= end.getTime();
}

export function slotDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export type WeekRange = { week: number; start: Date; end: Date };

export function buildSeasonWeekRanges(
  startDate: string | Date,
  endDate: string | Date
): WeekRange[] {
  const seasonStart = startOfWeekMonday(parseDateInput(startDate));
  const seasonEnd = endOfWeekSunday(parseDateInput(endDate));
  const ranges: WeekRange[] = [];

  let cursor = seasonStart;
  let weekCounter = 1;
  while (cursor.getTime() <= seasonEnd.getTime()) {
    const weekStart = cursor;
    const rawWeekEnd = addDays(weekStart, 6);
    const weekEnd = rawWeekEnd.getTime() > seasonEnd.getTime() ? seasonEnd : rawWeekEnd;
    ranges.push({ week: weekCounter, start: weekStart, end: weekEnd });
    cursor = addDays(weekStart, 7);
    weekCounter += 1;
  }

  return ranges;
}

export function resolveRunningWeek(weekRanges: WeekRange[], fallbackWeek: number) {
  if (weekRanges.length === 0) return fallbackWeek;

  const today = toMidnight(new Date());
  const active = weekRanges.find((range) =>
    isBetweenInclusive(today, range.start, range.end)
  );
  if (active) return active.week;

  if (today.getTime() < weekRanges[0].start.getTime()) {
    return weekRanges[0].week;
  }

  return weekRanges.at(-1)!.week;
}

export type SlotMeta = {
  id: string;
  label: string;
  slotDate: string | Date;
};

export type WeekSlot<T> = {
  key: string;
  date: Date;
  dayLabel: string;
  slotNumber: number;
  slotId?: string;
  slotLabel?: string;
  match?: T;
};

export function buildWeekSlotLayout<T extends { slot?: { slotDate: string | Date } | null }>(
  weekStart: Date,
  rows: T[],
  slotRows: SlotMeta[]
): { slots: Array<WeekSlot<T>>; selectedMatches: T[] } {
  const matchBuckets = new Map<string, T[]>();
  const slotBuckets = new Map<string, SlotMeta[]>();

  for (const row of rows) {
    if (!row.slot?.slotDate) continue;
    const key = slotDateKey(toMidnight(parseDateInput(row.slot.slotDate)));
    const list = matchBuckets.get(key) ?? [];
    list.push(row);
    matchBuckets.set(key, list);
  }

  for (const row of slotRows) {
    const key = slotDateKey(toMidnight(parseDateInput(row.slotDate)));
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
    const dayMatches = matchBuckets.get(key) ?? [];
    const daySlots = slotBuckets.get(key) ?? [];
    const dayLabel = new Intl.DateTimeFormat("en-US", { weekday: "short" })
      .format(date)
      .toUpperCase();

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
