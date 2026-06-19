import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { playerAvailability, players, users } from "@/db/schema";
import { bulkAvailabilitySchema } from "@/lib/validators";
import { eq } from "drizzle-orm";

export async function PUT(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = bulkAvailabilitySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const { playerId, slots } = parsed.data;

  // Verify the requesting user owns this player record
  const player = await db.query.players.findFirst({
    where: eq(players.id, playerId),
  });
  const profile = await db.query.users.findFirst({ where: eq(users.id, user.id) });

  if (!player || (player.userId !== user.id && profile?.role !== "admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Upsert availability rows
  await Promise.all(
    slots.map((slot) =>
      db
        .insert(playerAvailability)
        .values({
          slotId: slot.slotId,
          playerId,
          status: slot.status,
          note: slot.note,
        })
        .onConflictDoUpdate({
          target: [playerAvailability.slotId, playerAvailability.playerId],
          set: {
            status: slot.status,
            note: slot.note,
            updatedAt: new Date(),
          },
        })
    )
  );

  return NextResponse.json({ ok: true });
}
