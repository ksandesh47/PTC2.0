import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { players, seasonPlayers, playerAvailability, availabilitySlots, seasons } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { formatDate } from "@/lib/utils";
import Link from "next/link";

export default async function AvailabilityPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/player/availability");

  // Find linked player record
  const player = await db.query.players.findFirst({
    where: eq(players.userId, user.id),
  });

  if (!player) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center space-y-4">
        <h1 className="font-display text-4xl text-[--color-clay-500] tracking-widest">
          NO PLAYER PROFILE
        </h1>
        <p className="text-[--color-text-muted]">
          Your account is not linked to a player record yet. Contact your admin.
        </p>
      </div>
    );
  }

  // Get active season slots + current availability
  const activeSeason = await db.query.seasons.findFirst({
    where: eq(seasons.isActive, true),
  });

  if (!activeSeason) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="text-[--color-text-muted]">No active season.</p>
      </div>
    );
  }

  const slots = await db.query.availabilitySlots.findMany({
    where: eq(availabilitySlots.seasonId, activeSeason.id),
    orderBy: (t, { asc }) => [asc(t.weekNumber), asc(t.slotDate)],
  });

  const existingAvailability = await db.query.playerAvailability.findMany({
    where: eq(playerAvailability.playerId, player.id),
  });

  const availMap = new Map(existingAvailability.map((a) => [a.slotId, a]));

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-12 space-y-8">
      <div>
        <h1 className="font-display text-4xl tracking-widest text-[--color-clay-500]">
          MY AVAILABILITY
        </h1>
        <p className="text-sm text-[--color-text-muted] mt-1">
          {activeSeason.name} — {player.firstName} {player.lastName}
        </p>
      </div>

      <form action="/api/availability" method="POST" className="space-y-4">
        <input type="hidden" name="playerId" value={player.id} />

        {slots.length === 0 && (
          <p className="text-[--color-text-muted]">No slots defined yet.</p>
        )}

        <div className="space-y-3 animate-stagger">
          {slots.map((slot) => {
            const current = availMap.get(slot.id);
            return (
              <div
                key={slot.id}
                className="flex items-center justify-between rounded-lg border border-[--color-border] bg-[--color-surface] px-4 py-3"
              >
                <div>
                  <p className="font-semibold text-sm">{slot.label}</p>
                  <p className="text-xs text-[--color-text-muted]">
                    Week {slot.weekNumber} &middot; {formatDate(slot.slotDate)}
                  </p>
                </div>

                <div className="flex gap-2" role="group" aria-label={`Availability for ${slot.label}`}>
                  {(["available", "maybe", "unavailable"] as const).map((s) => (
                    <label
                      key={s}
                      className="cursor-pointer"
                      title={s.charAt(0).toUpperCase() + s.slice(1)}
                    >
                      <input
                        type="radio"
                        name={`slot_${slot.id}`}
                        value={s}
                        defaultChecked={current?.status === s || (!current && s === "available")}
                        className="sr-only peer"
                      />
                      <span
                        className={[
                          "inline-block rounded-full px-3 py-1 text-xs font-semibold transition-colors",
                          "border peer-checked:ring-2",
                          s === "available" && "border-[--color-forest-300] peer-checked:bg-[--color-forest-100] peer-checked:text-[--color-forest-700] peer-checked:ring-[--color-forest-400] text-[--color-forest-600]",
                          s === "maybe" && "border-yellow-300 peer-checked:bg-yellow-50 peer-checked:text-yellow-700 peer-checked:ring-yellow-400 text-yellow-600",
                          s === "unavailable" && "border-red-200 peer-checked:bg-red-50 peer-checked:text-red-700 peer-checked:ring-red-300 text-red-500",
                        ].filter(Boolean).join(" ")}
                      >
                        {s === "available" ? "✓" : s === "maybe" ? "~" : "✗"}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {slots.length > 0 && (
          <button
            type="submit"
            className="w-full rounded-md bg-[--color-accent] py-2.5 text-sm font-semibold text-white hover:bg-[--color-accent-hover] transition-colors"
          >
            Save Availability
          </button>
        )}
      </form>
    </div>
  );
}
