import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { playerAvailability, players, users } from "@/db/schema";
import { bulkAvailabilitySchema } from "@/lib/validators";
import { eq } from "drizzle-orm";

async function requireAuthorizedPlayer(userId: string, playerId: string) {
  const player = await db.query.players.findFirst({
    where: eq(players.id, playerId),
  });
  const profile = await db.query.users.findFirst({ where: eq(users.id, userId) });

  if (!player || (player.userId !== userId && profile?.role !== "admin")) {
    return null;
  }

  return player;
}

async function upsertAvailability(
  playerId: string,
  slots: Array<{ slotId: string; status: "available" | "maybe" | "unavailable"; note?: string }>
) {
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
}

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

  const player = await requireAuthorizedPlayer(user.id, playerId);
  if (!player) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await upsertAvailability(playerId, slots);

  return NextResponse.json({ ok: true });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/auth/login?next=/player/availability", req.url));
  }

  const form = await req.formData();
  const rawPlayerId = form.get("playerId");
  const playerId = typeof rawPlayerId === "string" ? rawPlayerId.trim() : "";
  if (!playerId) {
    return NextResponse.redirect(new URL("/player/availability?error=missing-player", req.url));
  }

  const player = await requireAuthorizedPlayer(user.id, playerId);
  if (!player) {
    return NextResponse.redirect(new URL("/player/availability?error=forbidden", req.url));
  }

  const slots: Array<{ slotId: string; status: "available" | "maybe" | "unavailable" }> = [];
  for (const [key, value] of form.entries()) {
    if (!key.startsWith("slot_")) continue;
    const slotId = key.slice(5);
    if (typeof value !== "string") continue;
    const status = value;
    if (status !== "available" && status !== "maybe" && status !== "unavailable") continue;
    if (!slotId) continue;
    slots.push({ slotId, status });
  }

  if (slots.length === 0) {
    return NextResponse.redirect(new URL("/player/availability?error=no-slots", req.url));
  }

  await upsertAvailability(playerId, slots);
  return NextResponse.redirect(new URL("/player/availability?saved=1", req.url));
}
