import { db } from "@/db";
import { PlayersRoster } from "@/components/admin/PlayersRoster";

export default async function AdminPlayersPage() {
  const roster = await db.query.players.findMany({
    orderBy: (t, { asc }) => [asc(t.firstName), asc(t.lastName)],
    with: { user: true },
  });

  const rows = roster.map((p) => ({
    id: p.id,
    firstName: p.firstName,
    lastName: p.lastName,
    phone: p.phone,
    email: p.user?.email ?? null,
    ntrpRating: p.ntrpRating,
    isActive: p.isActive,
  }));

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl space-y-4">
      <h1 className="font-display text-4xl tracking-widest text-(--color-clay-500)">PLAYERS</h1>
      <p className="text-sm text-(--color-text-muted)">
        Full roster ({rows.length} total)
      </p>
      <PlayersRoster roster={rows} />
    </div>
  );
}
