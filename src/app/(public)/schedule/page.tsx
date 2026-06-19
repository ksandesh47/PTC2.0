import { db } from "@/db";
import { matches, availabilitySlots, seasons, matchPairings, players } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { formatDate } from "@/lib/utils";

export const revalidate = 60;

async function getSchedule() {
  const activeSeason = await db.query.seasons.findFirst({
    where: eq(seasons.isActive, true),
  });
  if (!activeSeason) return { season: null, weeks: [] };

  const matchRows = await db
    .select({
      matchId: matches.id,
      weekNumber: matches.weekNumber,
      court: matches.court,
      status: matches.status,
      slotLabel: availabilitySlots.label,
      slotDate: availabilitySlots.slotDate,
    })
    .from(matches)
    .leftJoin(availabilitySlots, eq(availabilitySlots.id, matches.slotId))
    .where(
      and(eq(matches.seasonId, activeSeason.id))
    )
    .orderBy(matches.weekNumber);

  // Group by week
  const weekMap = new Map<number, typeof matchRows>();
  for (const m of matchRows) {
    const list = weekMap.get(m.weekNumber) ?? [];
    list.push(m);
    weekMap.set(m.weekNumber, list);
  }

  return { season: activeSeason, weeks: [...weekMap.entries()].sort(([a], [b]) => a - b) };
}

export default async function SchedulePage() {
  const { season, weeks } = await getSchedule();

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
        <p className="text-sm text-[--color-text-muted] mt-1">{season.name}</p>
      </div>

      {weeks.length === 0 && (
        <p className="text-[--color-text-muted]">No matches scheduled yet.</p>
      )}

      <div className="space-y-6 animate-stagger">
        {weeks.map(([week, weekMatches]) => (
          <section key={week}>
            <h2 className="font-display text-2xl tracking-wider text-[--color-text] mb-3">
              WEEK {week}
              {weekMatches[0]?.slotDate && (
                <span className="ml-3 text-base font-body font-normal text-[--color-text-muted]">
                  {formatDate(weekMatches[0].slotDate)}
                </span>
              )}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {weekMatches.map((m) => (
                <div
                  key={m.matchId}
                  className="rounded-lg border border-[--color-border] bg-[--color-surface] p-4 space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-[--color-text-muted]">
                      {m.court ?? "Court TBD"}
                    </span>
                    <StatusBadge status={m.status} />
                  </div>
                  {m.slotLabel && (
                    <p className="text-sm text-[--color-text-muted]">{m.slotLabel}</p>
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
