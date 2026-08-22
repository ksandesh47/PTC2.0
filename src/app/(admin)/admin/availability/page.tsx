import { db } from "@/db";
import { availabilitySlots, playerAvailability, players, seasonPlayers, seasons } from "@/db/schema";
import { and, asc, eq, gte, inArray, lte } from "drizzle-orm";
import { formatDate } from "@/lib/utils";

type AvailabilityStatus = "available" | "maybe" | "unavailable";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function singleParam(value: string | string[] | undefined) {
  if (!value) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

function monthKey(value: string | Date) {
  return String(value).slice(0, 7);
}

function monthLabel(key: string) {
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(
    new Date(`${key}-01T12:00:00`)
  );
}

function slotLabel(slot: { slotDate: string | Date; label: string }) {
  const date = new Date(`${String(slot.slotDate).slice(0, 10)}T12:00:00`);
  const day = new Intl.DateTimeFormat("en-US", { day: "numeric", weekday: "short" }).format(date);
  const detail = slot.label.split(" - ").at(-1) ?? slot.label;
  return `${day}, ${detail}`;
}

function statusCell(status: AvailabilityStatus | null) {
  if (status === "available") {
    return <span className="inline-flex min-w-10 justify-center rounded bg-(--color-forest-100) px-2 py-1 text-xs font-semibold text-(--color-forest-700)">A</span>;
  }
  if (status === "maybe") {
    return <span className="inline-flex min-w-10 justify-center rounded bg-yellow-100 px-2 py-1 text-xs font-semibold text-yellow-800">M</span>;
  }
  if (status === "unavailable") {
    return <span className="inline-flex min-w-10 justify-center rounded bg-red-100 px-2 py-1 text-xs font-semibold text-red-700">U</span>;
  }
  return <span className="inline-flex min-w-10 justify-center rounded border border-(--color-border) px-2 py-1 text-xs text-(--color-text-muted)">-</span>;
}

export default async function AdminAvailabilityPage({ searchParams }: Readonly<PageProps>) {
  const activeSeason = await db.query.seasons.findFirst({ where: eq(seasons.isActive, true) });

  if (!activeSeason) {
    return (
      <div className="p-6 lg:p-8">
        <h1 className="font-display text-4xl tracking-widest text-(--color-navy-500)">AVAILABILITY</h1>
        <p className="mt-3 text-sm text-(--color-text-muted)">No active season found.</p>
      </div>
    );
  }

  const [slots, roster] = await Promise.all([
    db.query.availabilitySlots.findMany({
      where: and(
        eq(availabilitySlots.seasonId, activeSeason.id),
        gte(availabilitySlots.slotDate, activeSeason.startDate),
        lte(availabilitySlots.slotDate, activeSeason.endDate)
      ),
      orderBy: (t, { asc }) => [asc(t.slotDate), asc(t.label)],
    }),
    db
      .select({ id: players.id, firstName: players.firstName, lastName: players.lastName })
      .from(seasonPlayers)
      .innerJoin(players, eq(players.id, seasonPlayers.playerId))
      .where(and(eq(seasonPlayers.seasonId, activeSeason.id), eq(players.isActive, true)))
      .orderBy(asc(players.firstName), asc(players.lastName)),
  ]);

  const slotIds = slots.map((s) => s.id);
  const playerIds = roster.map((p) => p.id);

  const availability =
    slotIds.length === 0 || playerIds.length === 0
      ? []
      : await db
          .select({ slotId: playerAvailability.slotId, playerId: playerAvailability.playerId, status: playerAvailability.status })
          .from(playerAvailability)
          .where(and(inArray(playerAvailability.slotId, slotIds), inArray(playerAvailability.playerId, playerIds)));

  const availabilityMap = new Map<string, AvailabilityStatus>();
  for (const a of availability) {
    availabilityMap.set(`${a.playerId}:${a.slotId}`, a.status);
  }

  const months = [...new Set(slots.map((slot) => monthKey(slot.slotDate)))].sort();
  const slotMonthById = new Map(slots.map((slot) => [slot.id, monthKey(slot.slotDate)]));
  const submittedMonths = new Set(
    availability
      .map((row) => slotMonthById.get(row.slotId))
      .filter((month): month is string => Boolean(month))
  );
  const requestedMonth = singleParam((await searchParams)?.month);
  const selectedMonth = requestedMonth && months.includes(requestedMonth)
    ? requestedMonth
    : months.find((month) => monthKey(new Date()) === month) ?? months[0] ?? "";
  const monthSlots = slots.filter((slot) => monthKey(slot.slotDate) === selectedMonth);
  const reportedPlayerIds = new Set(
    availability
      .filter((row) => monthSlots.some((slot) => slot.id === row.slotId))
      .map((row) => row.playerId)
  );
  const notReported = roster.filter((player) => !reportedPlayerIds.has(player.id));
  const reported = roster.filter((player) => reportedPlayerIds.has(player.id));

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1100px]">
      <div>
        <h1 className="font-display text-4xl tracking-widest text-(--color-navy-500)">REPORTED AVAILABILITY</h1>
        <p className="mt-1 text-sm text-(--color-text-muted)">
          {activeSeason.name} · {formatDate(activeSeason.startDate)} - {formatDate(activeSeason.endDate)}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="availability-month" className="text-xs uppercase tracking-widest text-(--color-text-muted)">
          Select month
        </label>
        <form method="get">
          <select
            id="availability-month"
            name="month"
            defaultValue={selectedMonth}
            className="rounded-lg border border-(--color-border) bg-(--color-surface) px-3 py-2 text-sm"
          >
            {months.map((month) => <option key={month} value={month}>{monthLabel(month)}</option>)}
          </select>
          <button
            type="submit"
            className="ml-2 rounded-lg border border-(--color-border) bg-(--color-surface) px-3 py-2 text-sm font-semibold hover:bg-(--color-navy-50)"
          >
            View
          </button>
        </form>
        <span className="text-sm text-(--color-text-muted)">{submittedMonths.size} month{submittedMonths.size === 1 ? "" : "s"} have submissions</span>
      </div>

      {slots.length === 0 || roster.length === 0 ? (
        <p className="text-sm text-(--color-text-muted)">No slots or enrolled players found for the active season.</p>
      ) : (
        <div className="space-y-5">
          <section className="overflow-hidden rounded-2xl border border-red-100 bg-red-50">
            <div className="flex items-center justify-between gap-3 border-b border-red-100 px-4 py-3 text-red-700">
              <h2 className="font-display text-xl tracking-wider">NOT YET REPORTED</h2>
              <span className="text-sm">{notReported.length} player{notReported.length === 1 ? "" : "s"}</span>
            </div>
            <div className="flex flex-wrap gap-2 px-4 py-4">
              {notReported.length > 0 ? notReported.map((player) => (
                <span key={player.id} className="rounded-full border border-red-100 bg-white px-3 py-1.5 text-sm text-red-700">
                  {player.firstName} {player.lastName}
                </span>
              )) : <p className="text-sm text-(--color-text-muted)">Everyone has reported for this month.</p>}
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-(--color-border) bg-(--color-surface)">
            <div className="flex items-center justify-between border-b border-(--color-border) px-4 py-3">
              <h2 className="font-display text-xl tracking-wider">{monthLabel(selectedMonth).toUpperCase()}</h2>
              <span className="text-sm text-(--color-text-muted)">{reported.length} players reported</span>
            </div>
            {reported.map((player) => {
              const playerAvailability = monthSlots
                .map((slot) => ({ slot, status: availabilityMap.get(`${player.id}:${slot.id}`) }))
                .filter(({ status }) => status === "available" || status === "maybe");
              return (
                <div key={player.id} className="border-b border-(--color-border) px-4 py-4 last:border-b-0">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <h3 className="font-display text-lg">{player.firstName} {player.lastName}</h3>
                    <span className="text-xs uppercase tracking-wider text-(--color-text-muted)">{playerAvailability.length} dates</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {playerAvailability.length > 0 ? playerAvailability.map(({ slot, status }) => (
                      <span key={slot.id} className={`rounded-full border px-3 py-1.5 text-xs ${status === "maybe" ? "border-yellow-200 bg-yellow-50 text-yellow-800" : "border-(--color-border) bg-(--color-navy-50) text-(--color-text)"}`}>
                        {slotLabel(slot)}{status === "maybe" ? " · Maybe" : ""}
                      </span>
                    )) : <span className="text-sm text-(--color-text-muted)">No available dates marked.</span>}
                  </div>
                </div>
              );
            })}
          </section>

          <div className="flex flex-wrap gap-2 text-xs text-(--color-text-muted)">
            <span className="rounded border border-(--color-border) px-2 py-1">A = Available</span>
            <span className="rounded border border-(--color-border) px-2 py-1">M = Maybe</span>
            <span className="rounded border border-(--color-border) px-2 py-1">U = Unavailable</span>
          </div>
        </div>
      )}
    </div>
  );
}
