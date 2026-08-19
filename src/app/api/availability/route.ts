import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { availabilitySlots, playerAvailability, players, users } from "@/db/schema";
import { bulkAvailabilitySchema } from "@/lib/validators";
import { eq, inArray } from "drizzle-orm";

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
  await db.transaction(async (tx) => {
    for (const slot of slots) {
      await tx
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
        });
    }
  });
}

async function validateSlotsInAvailabilityWindow(
  slots: Array<{ slotId: string }>
) {
  const slotIds = [...new Set(slots.map((slot) => slot.slotId))];
  const rows = await db.query.availabilitySlots.findMany({
    where: inArray(availabilitySlots.id, slotIds),
    with: {
      season: {
        columns: {
          id: true,
          isActive: true,
          availabilityWindowStart: true,
          availabilityWindowEnd: true,
        },
      },
    },
    columns: { id: true, slotDate: true, seasonId: true },
  });

  if (rows.length !== slotIds.length) return "One or more availability slots were not found";
  const seasonIds = new Set(rows.map((row) => row.seasonId));
  if (seasonIds.size !== 1) return "Availability slots must belong to one season";

  const season = rows[0]?.season;
  if (!season?.isActive) return "Availability can only be submitted for the active season";
  if (!season.availabilityWindowStart || !season.availabilityWindowEnd) {
    return "The availability window is not configured";
  }

  const outsideWindow = rows.some(
    (row) =>
      row.slotDate < season.availabilityWindowStart! ||
      row.slotDate > season.availabilityWindowEnd!
  );
  return outsideWindow ? "One or more slots are outside the availability window" : null;
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

  const { playerId } = parsed.data;

  const player = await requireAuthorizedPlayer(user.id, playerId);
  if (!player) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const slotError = await validateSlotsInAvailabilityWindow(parsed.data.slots);
  if (slotError) {
    return NextResponse.json({ error: slotError }, { status: 422 });
  }

  await upsertAvailability(playerId, parsed.data.slots);

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

  const slotError = await validateSlotsInAvailabilityWindow(slots);
  if (slotError) {
    return NextResponse.redirect(
      new URL(`/player/availability?error=${encodeURIComponent(slotError)}`, req.url)
    );
  }

  await upsertAvailability(playerId, slots);
  return NextResponse.redirect(new URL("/player/availability?saved=1", req.url));
}
