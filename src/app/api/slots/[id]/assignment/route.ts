import { NextRequest, NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import {
  auditEvents,
  availabilitySlots,
  matchPairings,
  matches,
  matchSets,
  users,
} from "@/db/schema";
import { slotMatchAssignmentSchema } from "@/lib/validators";

async function requireAdmin(userId: string) {
  const profile = await db.query.users.findFirst({ where: eq(users.id, userId) });
  return profile?.role === "admin" || profile?.role === "captain";
}

// POST /api/slots/[id]/assignment — create or reassign a match lineup for a slot
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: slotId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await requireAdmin(user.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = slotMatchAssignmentSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const slotRow = await db.query.availabilitySlots.findFirst({
    where: eq(availabilitySlots.id, slotId),
  });
  if (!slotRow) return NextResponse.json({ error: "Slot not found" }, { status: 404 });

  let existingMatch = await db.query.matches.findFirst({
    where: and(eq(matches.slotId, slotId), eq(matches.seasonId, slotRow.seasonId)),
  });

  let matchId = existingMatch?.id;
  if (!matchId) {
    // Assign next sequential match number within the season
    const nextMatchNumberRow = await db
      .select({
        next: sql<number>`coalesce(max(${matches.matchNumber}), 0) + 1`,
      })
      .from(matches)
      .where(eq(matches.seasonId, slotRow.seasonId));
    const nextMatchNumber = Number(nextMatchNumberRow[0]?.next ?? 1);

    const inserted = await db
      .insert(matches)
      .values({
        seasonId: slotRow.seasonId,
        slotId,
        weekNumber: slotRow.weekNumber,
        matchNumber: nextMatchNumber,
        status: "scheduled",
      })
      .returning({ id: matches.id });
    matchId = inserted[0]?.id;
    existingMatch = matchId
      ? await db.query.matches.findFirst({ where: eq(matches.id, matchId) })
      : undefined;
  }

  if (!matchId) {
    return NextResponse.json({ error: "Could not create match" }, { status: 500 });
  }

  const pairingRows = await db.query.matchPairings.findMany({
    where: eq(matchPairings.matchId, matchId),
  });

  if (pairingRows.length > 0) {
    const pairingIds = pairingRows.map((row) => row.id);
    const setRows = await db.query.matchSets.findMany({
      where: eq(matchSets.matchId, matchId),
    });
    if (setRows.length > 0) {
      return NextResponse.json(
        { error: "Cannot reassign players after scores are recorded" },
        { status: 409 }
      );
    }

    await db.delete(matchPairings).where(eq(matchPairings.matchId, matchId));

    if (pairingIds.length > 0) {
      // no-op block intentionally omitted; retaining pairingIds for audit diff context
    }
  }

  const payload = parsed.data;
  await db.insert(matchPairings).values({
    matchId,
    team1Player1Id: payload.team1Player1Id,
    team1Player2Id: payload.team1Player2Id,
    team2Player1Id: payload.team2Player1Id,
    team2Player2Id: payload.team2Player2Id,
  });

  await db
    .update(matches)
    .set({ status: "scheduled", abandonReason: null, updatedAt: new Date() })
    .where(eq(matches.id, matchId));

  await db.insert(auditEvents).values({
    actorId: user.id,
    action: "match_assign",
    resourceType: "match",
    resourceId: matchId,
    diff: {
      slotId,
      assignment: payload,
      previousStatus: existingMatch?.status ?? null,
      previousAbandonReason: existingMatch?.abandonReason ?? null,
    },
  });

  return NextResponse.json({ ok: true, matchId });
}
