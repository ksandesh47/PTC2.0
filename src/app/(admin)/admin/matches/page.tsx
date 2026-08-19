import Link from "next/link";
import { db } from "@/db";
import { matches, players, seasons } from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { formatDate } from "@/lib/utils";

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

export default async function AdminMatchesPage() {
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
      pairings: true,
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

  const scheduledCount = matchRows.filter((m) => m.status === "scheduled").length;
  const completedCount = matchRows.filter((m) => m.status === "completed").length;

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
        <div className="grid gap-4 md:grid-cols-2">
          {matchRows.map((m) => (
            <article key={m.id} className="rounded-xl border border-(--color-border) bg-(--color-surface) p-4 shadow-sm space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-(--color-text-muted)">Week {m.weekNumber}</p>
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
                    {rotatingSets(pairing).map((set) => (
                      <div key={set.label} className="grid grid-cols-[3rem_1fr_auto_1fr] items-center gap-2 border-b border-(--color-border) py-1 last:border-b-0">
                        <span className="text-xs font-semibold uppercase tracking-wider text-(--color-text-muted)">{set.label}</span>
                        <p className="font-semibold">
                          {set.team1.filter(Boolean).map((id) => playerName(playerMap, id)).join(" & ")}
                        </p>
                        <span className="text-xs text-(--color-text-muted)">vs</span>
                        <p className="font-semibold">
                          {set.team2.filter(Boolean).map((id) => playerName(playerMap, id)).join(" & ")}
                        </p>
                      </div>
                    ))}
                  </div>
                ))
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
