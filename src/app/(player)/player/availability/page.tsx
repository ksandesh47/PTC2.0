import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { players, playerAvailability, availabilitySlots, seasons } from "@/db/schema";
import { and, eq, gte, lte } from "drizzle-orm";
import AvailabilityWeeklyForm from "@/components/availability/AvailabilityWeeklyForm";

export default async function AvailabilityPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/player/availability");

  let player: Awaited<ReturnType<typeof db.query.players.findFirst>> = undefined;
  let activeSeason: Awaited<ReturnType<typeof db.query.seasons.findFirst>> = undefined;
  let slots: Awaited<ReturnType<typeof db.query.availabilitySlots.findMany>> = [];
  let existingAvailability: Awaited<ReturnType<typeof db.query.playerAvailability.findMany>> = [];

  try {
    player = await db.query.players.findFirst({
      where: eq(players.userId, user.id),
    });

    if (!player) {
      return (
        <div className="mx-auto max-w-2xl px-4 py-16 text-center space-y-4">
          <h1 className="font-display text-4xl text-(--color-clay-500) tracking-widest">
            NO PLAYER PROFILE
          </h1>
          <p className="text-(--color-text-muted)">
            Your account is not linked to a player record yet. Contact your admin.
          </p>
        </div>
      );
    }

    activeSeason = await db.query.seasons.findFirst({
      where: eq(seasons.isActive, true),
    });

    if (!activeSeason) {
      return (
        <div className="mx-auto max-w-2xl px-4 py-16 text-center">
          <p className="text-(--color-text-muted)">No active season.</p>
        </div>
      );
    }

    [slots, existingAvailability] = await Promise.all([
      db.query.availabilitySlots.findMany({
        where: and(
          eq(availabilitySlots.seasonId, activeSeason.id),
          gte(
            availabilitySlots.slotDate,
            activeSeason.availabilityWindowStart ?? activeSeason.startDate
          ),
          lte(
            availabilitySlots.slotDate,
            activeSeason.availabilityWindowEnd ?? activeSeason.endDate
          )
        ),
        orderBy: (t, { asc }) => [asc(t.weekNumber), asc(t.slotDate)],
      }),
      db.query.playerAvailability.findMany({
        where: eq(playerAvailability.playerId, player.id),
      }),
    ]);
  } catch {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center space-y-4">
        <h1 className="font-display text-4xl tracking-widest text-(--color-clay-500)">MY AVAILABILITY</h1>
        <p className="text-(--color-text-muted)">Data is temporarily unavailable. Please try again shortly.</p>
      </div>
    );
  }

  // TypeScript guard — both are guaranteed to be defined here (the try block returns early otherwise)
  if (!player || !activeSeason) return null;

  const availMap = new Map(existingAvailability.map((a) => [a.slotId, a.status]));

  const serializableSlots = slots.map((slot) => ({
    id: slot.id,
    label: slot.label,
    slotDate: slot.slotDate,
    weekNumber: slot.weekNumber,
    status: availMap.get(slot.id) ?? "available",
  }));

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-12 space-y-8">
      <div>
        <h1 className="font-display text-4xl tracking-widest text-(--color-clay-500)">
          MY AVAILABILITY
        </h1>
        <p className="text-sm text-(--color-text-muted) mt-1">
          {activeSeason.name} — {player.firstName} {player.lastName}
        </p>
      </div>

      <AvailabilityWeeklyForm playerId={player.id} slots={serializableSlots} />
    </div>
  );
}
