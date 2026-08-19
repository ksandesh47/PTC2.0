import Link from "next/link";
import { db } from "@/db";
import { matches, players, seasons } from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { formatDate } from "@/lib/utils";
import { buildMatchSetRows } from "@/lib/league/display";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function playerName(playerMap: Map<string, string>, id: string | null | undefined) {
  if (!id) return "TBD";
  return playerMap.get(id) ?? "Unknown";
}

function rotatingSets(pairing: {
  team1Player1Id: string;
  team1Player2Id: string | null;
  team2Player1Id: string;
  team2Player2Id: string | null;
}) {
  const [p1, p2, p3, p4] = [
    pairing.team1Player1Id,
    pairing.team1Player2Id,
    pairing.team2Player1Id,
    pairing.team2Player2Id,
  ];
  return [
    { label: "Set 1", team1: [p1, p2], team2: [p3, p4] },
    { label: "Set 2", team1: [p1, p3], team2: [p2, p4] },
    { label: "Set 3", team1: [p1, p4], team2: [p2, p3] },
  ];
}

function weekStart(dateValue: string | Date) {
  const date = dateValue instanceof Date
    ? new Date(dateValue)
    : new Date(`${dateValue.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return new Date(0);
  const day = date.getDay();
  date.setDate(date.getDate() + (day === 0 ? -6 : 1 - day));
  date.setHours(0, 0, 0, 0);
  return date;
}

function weekKey(dateValue: string | Date) {
  return weekStart(dateValue).toISOString().slice(0, 10);
}

function weekTitle(start: Date) {
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const formatter = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" });
  return `${formatter.format(start)} - ${formatter.format(end)}`;
}

function singleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminMatchesPage({ searchParams }: Readonly<PageProps>) {
  const activeSeason = await db.query.seasons.findFirst({
    where: eq(seasons.isActive, true),
  });

  if (!activeSeason) {
    return (
      <div className="p-6 lg:p-8 max-w-5xl">
        <h1 className="font-display text-4xl tracking-widest text-(--color-navy-500)">MATCH BUILDER</h1>
        <p className="mt-3 text-sm text-(--color-text-muted)">No active season configured.</p>
      </div>
    );
  }

  const matchRows = await db.query.matches.findMany({
    where: and(eq(matches.seasonId, activeSeason.id)),
    with: {
      slot: true,
      pairings: { with: { sets: true } },
    },
    orderBy: (t, { asc }) => [asc(t.weekNumber), asc(t.createdAt)],
  });

  const playerIds = [...new Set(
    matchRows.flatMap((m) =>
      m.pairings.flatMap((p) => [p.team1Player1Id, p.team1Player2Id, p.team2Player1Id, p.team2Player2Id])
    ).filter(Boolean)
  )] as string[];

  const playerRows =
    playerIds.length > 0
      ? await db
          .select({ id: players.id, firstName: players.firstName, lastName: players.lastName })
          .from(players)
          .where(inArray(players.id, playerIds))
      : [];

  const playerMap = new Map(playerRows.map((p) => [p.id, `${p.firstName} ${p.lastName}`]));
  const weekGroups = Array.from(
    matchRows.reduce((groups, match) => {
      const key = match.slot?.slotDate ? weekKey(match.slot.slotDate) : "pending";
      const current = groups.get(key);
      if (current) current.push(match);
      else groups.set(key, [match]);
      return groups;
    }, new Map<string, typeof matchRows>())
  );

  const scheduledCount = matchRows.filter((m) => m.status === "scheduled").length;
  const completedCount = matchRows.filter((m) => m.status === "completed").length;
  const params = (await searchParams) ?? {};
  const requestedWeek = singleParam(params.week);
  const datedGroups = weekGroups.filter(([key]) => key !== "pending");
  const currentWeekKey = weekKey(new Date());
  const defaultGroupIndex = Math.max(
    0,
    datedGroups.findIndex(([key]) => key === currentWeekKey)
  );
  const selectedGroupIndex = requestedWeek
    ? Math.max(0, datedGroups.findIndex(([key]) => key === requestedWeek))
    : defaultGroupIndex;
  const selectedGroup = datedGroups[selectedGroupIndex] ?? datedGroups[0];
  const previousGroup = datedGroups[selectedGroupIndex - 1];
  const nextGroup = datedGroups[selectedGroupIndex + 1];

  return (
    <div className="p-6 lg:p-8 max-w-6xl space-y-6">
      <div>
        <h1 className="font-display text-4xl tracking-widest text-(--color-navy-500)">MATCH BUILDER</h1>
        <p className="mt-1 text-sm text-(--color-text-muted)">
          {activeSeason.name} · {scheduledCount} scheduled · {completedCount} completed
        </p>
      </div>

      <div className="flex flex-wrap gap-3 text-sm">
        <Link href="/schedule" className="rounded-md border border-(--color-border) px-3 py-1.5 font-semibold hover:bg-(--color-navy-50)">
          Open Public Schedule
        </Link>
        <Link href="/admin/scores" className="rounded-md border border-(--color-border) px-3 py-1.5 font-semibold hover:bg-(--color-navy-50)">
          Open Score Entry
        </Link>
      </div>

      {matchRows.length === 0 ? (
        <p className="text-sm text-(--color-text-muted)">No matches created for the active season.</p>
      ) : (
        <div className="space-y-5">
          {selectedGroup ? (
            <>
              <div className="flex items-center justify-between gap-3 rounded-lg border border-(--color-border) bg-(--color-surface) px-3 py-2">
                {previousGroup ? (
                  <Link href={`/admin/matches?week=${previousGroup[0]}`} className="rounded-md border border-(--color-border) px-3 py-1.5 text-sm font-semibold hover:bg-(--color-navy-50)">← Prev</Link>
                ) : <span />}
                <h2 className="font-display text-xl tracking-wider text-(--color-navy-600)">{weekTitle(weekStart(selectedGroup[1][0].slot!.slotDate))}</h2>
                {nextGroup ? (
                  <Link href={`/admin/matches?week=${nextGroup[0]}`} className="rounded-md border border-(--color-border) px-3 py-1.5 text-sm font-semibold hover:bg-(--color-navy-50)">Next →</Link>
                ) : <span />}
              </div>
              <div className="grid gap-4 md:grid-cols-2">
              {selectedGroup[1].map((m) => (
            <article key={m.id} className="rounded-xl border border-(--color-border) bg-(--color-surface) p-4 shadow-sm space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-(--color-text-muted)">
                    {m.slot?.slotDate ? formatDate(m.slot.slotDate) : "Date pending"} · {m.slot?.label ?? m.court ?? "Court TBD"}
                  </p>
                </div>
                <span className="rounded-full bg-(--color-navy-100) px-2 py-0.5 text-xs font-semibold capitalize text-(--color-navy-700)">
                  {m.status.replace("_", " ")}
                </span>
              </div>

              {m.pairings.length === 0 ? (
                <p className="text-sm text-(--color-text-muted)">No lineup assigned yet.</p>
              ) : (
                m.pairings.map((pairing) => (
                  <div key={pairing.id} className="rounded-lg border border-(--color-border) bg-(--color-navy-50) px-3 py-2 text-sm space-y-1">
                    {rotatingSets(pairing).map((set, index) => {
                      const scoreRow = buildMatchSetRows([pairing]).find((row) => row.setNumber === index + 1);
                      return (
                      <div key={set.label} className="grid grid-cols-[3rem_1fr_auto_auto_auto_1fr] items-center gap-2 border-b border-(--color-border) py-1 last:border-b-0">
                        <span className="text-xs font-semibold uppercase tracking-wider text-(--color-text-muted)">{set.label}</span>
                        <p className="font-semibold">
                          {set.team1.filter(Boolean).map((id) => playerName(playerMap, id)).join(" & ")}
                        </p>
                        <span className="text-xs text-(--color-text-muted)">vs</span>
                        {scoreRow ? <span className="font-bold text-(--color-navy-600)">{scoreRow.team1Games} - {scoreRow.team2Games}</span> : <span />}
                        <p className="font-semibold">
                          {set.team2.filter(Boolean).map((id) => playerName(playerMap, id)).join(" & ")}
                        </p>
                      </div>
                      );
                    })}
                  </div>
                ))
              )}
            </article>
          ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-(--color-text-muted)">No dated match weeks are available.</p>
          )}
        </div>
      )}
    </div>
  );
}
