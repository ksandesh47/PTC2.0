import { NextRequest, NextResponse } from "next/server";
import { and, eq, sql, inArray } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { pickFairCandidates } from "@/lib/league/fairness";
import {
  auditEvents,
  availabilitySlots,
  matchPairings,
  matches,
  playerAvailability,
  seasonPlayers,
  players,
  users,
} from "@/db/schema";

async function requireAdmin(userId: string) {
  const profile = await db.query.users.findFirst({ where: eq(users.id, userId) });
  return profile?.role === "admin" || profile?.role === "captain";
}

// POST /api/slots/[id]/auto-assign — automatically pick 4 players (fewest games, available/maybe)
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: slotId } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await requireAdmin(user.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const slotRow = await db.query.availabilitySlots.findFirst({
    where: eq(availabilitySlots.id, slotId),
  });
  if (!slotRow) return NextResponse.json({ error: "Slot not found" }, { status: 404 });

  // Refuse if a match with pairings already exists on this slot
  const existing = await db.query.matches.findFirst({
    where: and(eq(matches.slotId, slotId), eq(matches.seasonId, slotRow.seasonId)),
    with: { pairings: true },
  });
  if (existing && existing.pairings.length > 0) {
    return NextResponse.json({ error: "Slot already has a lineup" }, { status: 409 });
  }

  // Available/maybe players for this slot (season-enrolled + active)
  const availabilityRows = await db
    .select({
      playerId: playerAvailability.playerId,
      status: playerAvailability.status,
      firstName: players.firstName,
      lastName: players.lastName,
    })
    .from(playerAvailability)
    .innerJoin(seasonPlayers, and(
      eq(seasonPlayers.playerId, playerAvailability.playerId),
      eq(seasonPlayers.seasonId, slotRow.seasonId),
    ))
    .innerJoin(players, and(
      eq(players.id, playerAvailability.playerId),
      eq(players.isActive, true),
    ))
    .where(and(
      eq(playerAvailability.slotId, slotId),
      inArray(playerAvailability.status, ["available", "maybe"]),
    ));

  if (availabilityRows.length < 4) {
    return NextResponse.json(
      { error: `Only ${availabilityRows.length} available player(s); need 4.` },
      { status: 409 }
    );
  }

  // Games played this season per candidate — non-cancelled matches only
  const pairingRows = await db
    .select({
      matchId: matchPairings.matchId,
      t1p1: matchPairings.team1Player1Id,
      t1p2: matchPairings.team1Player2Id,
      t2p1: matchPairings.team2Player1Id,
      t2p2: matchPairings.team2Player2Id,
      status: matches.status,
      weekNumber: matches.weekNumber,
    })
    .from(matchPairings)
    .innerJoin(matches, eq(matches.id, matchPairings.matchId))
    .where(eq(matches.seasonId, slotRow.seasonId));

  const weekAvailabilityRows = await db
    .select({
      playerId: playerAvailability.playerId,
      status: playerAvailability.status,
    })
    .from(playerAvailability)
    .innerJoin(availabilitySlots, eq(availabilitySlots.id, playerAvailability.slotId))
    .where(and(
      eq(availabilitySlots.seasonId, slotRow.seasonId),
      eq(availabilitySlots.weekNumber, slotRow.weekNumber),
      inArray(playerAvailability.status, ["available", "maybe"]),
    ));

  const gamesByPlayer = new Map<string, number>();
  const weeklyGamesByPlayer = new Map<string, number>();
  const seen = new Set<string>();
  for (const row of pairingRows) {
    if (row.status === "cancelled" || row.status === "abandoned") continue;
    for (const pid of [row.t1p1, row.t1p2, row.t2p1, row.t2p2]) {
      if (!pid) continue;
      const key = `${pid}|${row.matchId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      gamesByPlayer.set(pid, (gamesByPlayer.get(pid) ?? 0) + 1);
      if (row.matchId !== existing?.id && row.weekNumber === slotRow.weekNumber) {
        weeklyGamesByPlayer.set(pid, (weeklyGamesByPlayer.get(pid) ?? 0) + 1);
      }
    }
  }

  const availableByPlayer = new Map<string, number>();
  for (const row of weekAvailabilityRows) {
    availableByPlayer.set(row.playerId, (availableByPlayer.get(row.playerId) ?? 0) + 1);
  }

  const candidates = availabilityRows.map((row) => ({
    playerId: row.playerId,
    status: row.status,
    name: `${row.firstName} ${row.lastName}`.trim(),
    weeklyGames: weeklyGamesByPlayer.get(row.playerId) ?? 0,
    seasonGames: gamesByPlayer.get(row.playerId) ?? 0,
    weeklyAvailability: availableByPlayer.get(row.playerId) ?? 0,
  }));
  const ranked = pickFairCandidates(candidates).map((candidate) => candidate.playerId);

  // Create or reuse the match, then insert one doubles pairing.
  let matchId = existing?.id;
  if (!matchId) {
    const nextMatchNumberRow = await db
      .select({ next: sql<number>`coalesce(max(${matches.matchNumber}), 0) + 1` })
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
  }
  if (!matchId) {
    return NextResponse.json({ error: "Failed to create match" }, { status: 500 });
  }

  await db.insert(matchPairings).values({
    matchId,
    team1Player1Id: ranked[0],
    team1Player2Id: ranked[1],
    team2Player1Id: ranked[2],
    team2Player2Id: ranked[3],
  });

  await db.insert(auditEvents).values({
    actorId: user.id,
    action: "match_assign",
    resourceType: "match",
    resourceId: matchId,
    metadata: { slotId, playerIds: ranked, auto: true },
  });

  return NextResponse.json({ success: true, matchId, playerIds: ranked });
}
