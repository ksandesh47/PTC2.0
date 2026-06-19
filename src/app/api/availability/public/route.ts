import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { playerAvailability, players, seasons } from "@/db/schema";
import { and, eq } from "drizzle-orm";

async function upsertAvailability(
  playerId: string,
  slots: Array<{ slotId: string; status: "available" | "maybe" | "unavailable" }>
) {
  await Promise.all(
    slots.map((slot) =>
      db
        .insert(playerAvailability)
        .values({
          slotId: slot.slotId,
          playerId,
          status: slot.status,
        })
        .onConflictDoUpdate({
          target: [playerAvailability.slotId, playerAvailability.playerId],
          set: {
            status: slot.status,
            updatedAt: new Date(),
          },
        })
    )
  );
}

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const rawPlayerId = form.get("playerId");
  const playerId = typeof rawPlayerId === "string" ? rawPlayerId.trim() : "";

  if (!playerId) {
    return NextResponse.redirect(new URL("/availability?error=missing-player", req.url));
  }

  const activeSeason = await db.query.seasons.findFirst({
    where: eq(seasons.isActive, true),
  });

  if (!activeSeason) {
    return NextResponse.redirect(new URL("/availability?error=no-season", req.url));
  }

  const player = await db.query.players.findFirst({
    where: and(eq(players.id, playerId), eq(players.isActive, true)),
  });

  if (!player) {
    return NextResponse.redirect(new URL("/availability?error=invalid-player", req.url));
  }

  const slots: Array<{ slotId: string; status: "available" | "maybe" | "unavailable" }> = [];
  for (const [key, value] of form.entries()) {
    if (!key.startsWith("slot_")) continue;
    if (typeof value !== "string") continue;
    const slotId = key.slice(5);
    if (!slotId) continue;
    if (value !== "available" && value !== "maybe" && value !== "unavailable") continue;
    slots.push({ slotId, status: value });
  }

  if (slots.length === 0) {
    return NextResponse.redirect(new URL(`/availability?player=${playerId}&error=no-slots`, req.url));
  }

  await upsertAvailability(playerId, slots);
  return NextResponse.redirect(new URL(`/availability?player=${playerId}&saved=1`, req.url), { status: 303 });
}
