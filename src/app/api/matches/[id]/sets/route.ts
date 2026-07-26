import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { matchSets, matchPairings, auditEvents, users } from "@/db/schema";
import { matchSetsSchema, scoreCorrectionSchema } from "@/lib/validators";
import { and, eq } from "drizzle-orm";

async function requireAdmin(userId: string) {
  const profile = await db.query.users.findFirst({ where: eq(users.id, userId) });
  return profile?.role === "admin" || profile?.role === "captain";
}

// POST /api/matches/[id]/sets — record sets (admin/captain only)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: matchId } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await requireAdmin(user.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const isCorrection = !!body.correctionReason;
  const schema = isCorrection ? scoreCorrectionSchema : matchSetsSchema;
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const { pairingId: incomingPairingId, pairing, sets } = parsed.data;
  const correctionReason = isCorrection ? (parsed.data as unknown as { correctionReason: string }).correctionReason : undefined;

  let pairingId = incomingPairingId;
  if (!pairingId && pairing) {
    const existingPairing = await db.query.matchPairings.findFirst({
      where: and(
        eq(matchPairings.matchId, matchId),
        eq(matchPairings.team1Player1Id, pairing.team1Player1Id),
        eq(matchPairings.team1Player2Id, pairing.team1Player2Id),
        eq(matchPairings.team2Player1Id, pairing.team2Player1Id),
        eq(matchPairings.team2Player2Id, pairing.team2Player2Id)
      ),
    });

    if (existingPairing) {
      pairingId = existingPairing.id;
    } else {
      const inserted = await db
        .insert(matchPairings)
        .values({
          matchId,
          team1Player1Id: pairing.team1Player1Id,
          team1Player2Id: pairing.team1Player2Id,
          team2Player1Id: pairing.team2Player1Id,
          team2Player2Id: pairing.team2Player2Id,
        })
        .returning({ id: matchPairings.id });
      pairingId = inserted[0]?.id;
    }
  }

  if (!pairingId) {
    return NextResponse.json({ error: "Pairing could not be resolved" }, { status: 422 });
  }

  // Append-only: get current max version for this pairing
  const existing = await db.query.matchSets.findMany({
    where: eq(matchSets.pairingId, pairingId),
    orderBy: (t, { desc }) => [desc(t.version)],
  });
  const nextVersion = (existing[0]?.version ?? 0) + 1;

  // Insert all set rows
  await db.insert(matchSets).values(
    sets.map((s) => ({
      matchId,
      pairingId,
      setNumber: s.setNumber,
      team1Games: s.team1Games,
      team2Games: s.team2Games,
      isTiebreak: s.isTiebreak,
      tiebreakTeam1: s.tiebreakTeam1,
      tiebreakTeam2: s.tiebreakTeam2,
      version: nextVersion,
      correctedBy: isCorrection ? user.id : undefined,
      correctionReason,
      recordedBy: user.id,
    }))
  );

  // Record audit event
  await db.insert(auditEvents).values({
    actorId: user.id,
    action: isCorrection ? "score_correction" : "score_entry",
    resourceType: "match",
    resourceId: matchId,
    diff: { sets, version: nextVersion },
  });

  return NextResponse.json({ ok: true, version: nextVersion });
}
