import { db } from "@/db";
import { players } from "@/db/schema";
import { eq } from "drizzle-orm";

export default async function AdminPlayersPage() {
  const roster = await db.query.players.findMany({
    where: eq(players.isActive, true),
    orderBy: (t, { asc }) => [asc(t.firstName), asc(t.lastName)],
  });

  return (
    <div className="p-6 lg:p-8 max-w-5xl space-y-4">
      <h1 className="font-display text-4xl tracking-widest text-[--color-clay-500]">PLAYERS</h1>
      <p className="text-sm text-[--color-text-muted]">Active roster ({roster.length})</p>
      <div className="rounded-lg border border-[--color-border] bg-[--color-surface] divide-y divide-[--color-border]">
        {roster.map((p) => (
          <div key={p.id} className="px-4 py-3 flex items-center justify-between gap-3">
            <span className="font-semibold">{p.firstName} {p.lastName}</span>
            <span className="text-xs text-[--color-text-muted]">{p.ntrpRating ?? "—"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
