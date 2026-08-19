import { db } from "@/db";
import { substituteRequests } from "@/db/schema";
import { desc } from "drizzle-orm";
import { SubstituteAdminPanel } from "@/components/admin/SubstituteAdminPanel";

export default async function AdminSubstitutesPage() {
  const rows = await db.query.substituteRequests.findMany({
    orderBy: [desc(substituteRequests.createdAt)],
    with: {
      requester: { columns: { firstName: true, lastName: true } },
      match: { with: { slot: true } },
      offers: { with: { player: { columns: { firstName: true, lastName: true } } } },
    },
  });

  const requests = rows.map((request) => ({
    id: request.id,
    matchId: request.matchId,
    status: request.status,
    reason: request.reason,
    requesterName: `${request.requester.firstName} ${request.requester.lastName}`.trim(),
    slot: request.match.slot
      ? { label: request.match.slot.label, date: String(request.match.slot.slotDate) }
      : null,
    offers: request.offers.map((offer) => ({
      playerId: offer.playerId,
      playerName: `${offer.player.firstName} ${offer.player.lastName}`.trim(),
      status: offer.status,
    })),
  }));

  return (
    <div className="p-6 lg:p-8 max-w-5xl space-y-5">
      <div>
        <h1 className="font-display text-4xl tracking-widest text-(--color-navy-500)">SUBSTITUTES</h1>
        <p className="mt-1 text-sm text-(--color-text-muted)">Review open requests and select a player offer.</p>
      </div>
      <SubstituteAdminPanel requests={requests} />
    </div>
  );
}
