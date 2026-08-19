import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { auditEvents, matches, matchPairings, users } from "@/db/schema";
import { matchStatusUpdateSchema } from "@/lib/validators";
import { recomputeSeasonStandings } from "@/lib/league/recompute-standings";
import { canTransitionMatchStatus, type MatchStatus } from "@/lib/league/match-status";

async function requireAdmin(userId: string) {
  const profile = await db.query.users.findFirst({ where: eq(users.id, userId) });
  return profile?.role === "admin" || profile?.role === "captain";
}

// PATCH /api/matches/[id]/status — update a match status (admin/captain only)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: matchId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await requireAdmin(user.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = matchStatusUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const existingMatch = await db.query.matches.findFirst({
    where: eq(matches.id, matchId),
  });

  if (!existingMatch) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }

  const { status, abandonReason } = parsed.data;
  const nextStatus = status as MatchStatus;
  const currentStatus = existingMatch.status as MatchStatus;
  if (!canTransitionMatchStatus(currentStatus, nextStatus)) {
    return NextResponse.json(
      { error: `Cannot change match status from ${currentStatus} to ${nextStatus}` },
      { status: 409 }
    );
  }

  const reason = abandonReason?.trim() || null;
  if ((status === "abandoned" || status === "cancelled") && !reason) {
    return NextResponse.json(
      { error: "A reason is required when abandoning or cancelling a match" },
      { status: 422 }
    );
  }

  if (status === "completed") {
    const pairings = await db.query.matchPairings.findMany({
      where: eq(matchPairings.matchId, matchId),
      with: { sets: true },
    });
    const setCount = pairings.reduce((total, pairing) => total + pairing.sets.length, 0);
    if (setCount === 0) {
      return NextResponse.json(
        { error: "A match must have recorded sets before it can be completed" },
        { status: 422 }
      );
    }
  }

  await db
    .update(matches)
    .set({
      status,
      abandonReason:
        status === "cancelled" || status === "abandoned"
          ? reason
          : null,
      updatedAt: new Date(),
    })
    .where(and(eq(matches.id, matchId)));

  await db.insert(auditEvents).values({
    actorId: user.id,
    action: status === "cancelled" || status === "abandoned" ? "match_abandon" : "update",
    resourceType: "match",
    resourceId: matchId,
    diff: {
      fromStatus: existingMatch.status,
      toStatus: status,
      abandonReason: status === "cancelled" || status === "abandoned" ? reason : null,
    },
  });

  if (status === "completed" || existingMatch.status === "completed") {
    await recomputeSeasonStandings(existingMatch.seasonId);
  }

  return NextResponse.json({ ok: true });
}
