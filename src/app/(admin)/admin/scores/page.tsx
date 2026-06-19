import Link from "next/link";
import { db } from "@/db";
import { matches, seasons } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { formatDate } from "@/lib/utils";

export default async function AdminScoresPage() {
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
          sets: {
            orderBy: (t, { desc }) => [desc(t.version), desc(t.recordedAt)],
          },
        },
      },
    },
    orderBy: (t, { asc }) => [asc(t.weekNumber), asc(t.createdAt)],
  });

  const setCountByMatch = new Map<string, number>();
  for (const match of matchRows) {
    let count = 0;
    for (const pairing of match.pairings) {
      const newestVersion = pairing.sets[0]?.version;
      if (!newestVersion) continue;
      count += pairing.sets.filter((s) => s.version === newestVersion).length;
    }
    setCountByMatch.set(match.id, count);
  }

  const readyForScoring = matchRows.filter((m) => m.status === "scheduled" || m.status === "in_progress");
  const enteredScores = matchRows.filter((m) => (setCountByMatch.get(m.id) ?? 0) > 0 || m.status === "completed");

  return (
    <div className="p-6 lg:p-8 max-w-6xl space-y-6">
      <div>
        <h1 className="font-display text-4xl tracking-widest text-[--color-clay-500]">SCORE ENTRY</h1>
        <p className="mt-1 text-sm text-[--color-text-muted]">
          {activeSeason.name} · {readyForScoring.length} pending · {enteredScores.length} with recorded score data
        </p>
      </div>

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
        {readyForScoring.length === 0 ? (
          <p className="text-sm text-[--color-text-muted]">No scheduled or in-progress matches right now.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {readyForScoring.map((m) => (
              <article key={m.id} className="rounded-xl border border-[--color-border] bg-[--color-surface] p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wider text-[--color-text-muted]">Week {m.weekNumber}</p>
                <p className="text-sm text-[--color-text-muted] mt-1">
                  {m.slot?.slotDate ? formatDate(m.slot.slotDate) : "Date pending"} · {m.slot?.label ?? m.court ?? "Court TBD"}
                </p>
                <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-[--color-clay-600]">
                  Status: {m.status.replace("_", " ")}
                </p>
                <p className="mt-2 text-xs text-[--color-text-muted]">
                  Match ID: {m.id}
                </p>
                <p className="mt-1 text-xs text-[--color-text-muted]">
                  Use POST /api/matches/{m.id}/sets to submit set rows.
                </p>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-2xl tracking-wider">RECENTLY SCORED</h2>
        {enteredScores.length === 0 ? (
          <p className="text-sm text-[--color-text-muted]">No scored matches yet.</p>
        ) : (
          <div className="rounded-xl border border-[--color-border] bg-[--color-surface] divide-y divide-[--color-border]">
            {enteredScores.slice(0, 25).map((m) => (
              <div key={m.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <div>
                  <p className="font-semibold">Week {m.weekNumber} · {m.slot?.slotDate ? formatDate(m.slot.slotDate) : "Date pending"}</p>
                  <p className="text-xs text-[--color-text-muted]">{m.slot?.label ?? m.court ?? "Court TBD"}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[--color-clay-600]">{m.status.replace("_", " ")}</p>
                  <p className="text-xs text-[--color-text-muted]">{setCountByMatch.get(m.id) ?? 0} sets</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
