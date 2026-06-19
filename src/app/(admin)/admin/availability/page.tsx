import { db } from "@/db";
import { availabilitySlots, playerAvailability, players, seasonPlayers, seasons } from "@/db/schema";
import { and, asc, eq, gte, inArray, lte } from "drizzle-orm";
import { formatDate } from "@/lib/utils";

type AvailabilityStatus = "available" | "maybe" | "unavailable";

function statusCell(status: AvailabilityStatus | null) {
  if (status === "available") {
    return <span className="inline-flex min-w-10 justify-center rounded bg-[--color-forest-100] px-2 py-1 text-xs font-semibold text-[--color-forest-700]">A</span>;
  }
  if (status === "maybe") {
    return <span className="inline-flex min-w-10 justify-center rounded bg-yellow-100 px-2 py-1 text-xs font-semibold text-yellow-800">M</span>;
  }
  if (status === "unavailable") {
    return <span className="inline-flex min-w-10 justify-center rounded bg-red-100 px-2 py-1 text-xs font-semibold text-red-700">U</span>;
  }
  return <span className="inline-flex min-w-10 justify-center rounded border border-[--color-border] px-2 py-1 text-xs text-[--color-text-muted]">-</span>;
}

export default async function AdminAvailabilityPage() {
  const activeSeason = await db.query.seasons.findFirst({ where: eq(seasons.isActive, true) });

  if (!activeSeason) {
    return (
      <div className="p-6 lg:p-8">
        <h1 className="font-display text-4xl tracking-widest text-[--color-clay-500]">AVAILABILITY</h1>
        <p className="mt-3 text-sm text-[--color-text-muted]">No active season found.</p>
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

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1400px]">
      <div>
        <h1 className="font-display text-4xl tracking-widest text-[--color-clay-500]">ALL AVAILABILITY</h1>
        <p className="mt-1 text-sm text-[--color-text-muted]">
          {activeSeason.name} · {formatDate(activeSeason.startDate)} - {formatDate(activeSeason.endDate)}
        </p>
      </div>

      <div className="flex flex-wrap gap-2 text-xs text-[--color-text-muted]">
        <span className="rounded border border-[--color-border] px-2 py-1">A = Available</span>
        <span className="rounded border border-[--color-border] px-2 py-1">M = Maybe</span>
        <span className="rounded border border-[--color-border] px-2 py-1">U = Unavailable</span>
      </div>

      {slots.length === 0 || roster.length === 0 ? (
        <p className="text-sm text-[--color-text-muted]">No slots or enrolled players found for the active season.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[--color-border] bg-[--color-surface]">
          <table className="min-w-full border-collapse text-xs">
            <thead>
              <tr className="border-b border-[--color-border] bg-[--color-clay-50]">
                <th className="sticky left-0 z-10 bg-[--color-clay-50] px-3 py-2 text-left font-semibold">Player</th>
                {slots.map((slot) => (
                  <th key={slot.id} className="min-w-36 border-l border-[--color-border] px-2 py-2 text-center font-semibold">
                    <div>{slot.label}</div>
                    <div className="text-[10px] font-normal text-[--color-text-muted]">W{slot.weekNumber}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {roster.map((player) => (
                <tr key={player.id} className="border-b border-[--color-border] last:border-b-0">
                  <td className="sticky left-0 z-10 bg-[--color-surface] px-3 py-2 font-semibold whitespace-nowrap">
                    {player.firstName} {player.lastName}
                  </td>
                  {slots.map((slot) => {
                    const status = availabilityMap.get(`${player.id}:${slot.id}`) ?? null;
                    return (
                      <td key={slot.id} className="border-l border-[--color-border] px-2 py-2 text-center align-middle">
                        {statusCell(status)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
