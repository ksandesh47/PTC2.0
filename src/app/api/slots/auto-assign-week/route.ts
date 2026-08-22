import { NextRequest, NextResponse } from "next/server";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import {
  auditEvents,
  availabilitySlots,
  matchPairings,
  matches,
  playerAvailability,
  players,
  seasonPlayers,
  seasons,
  users,
} from "@/db/schema";
import { pickFairCandidates, type FairnessCandidate } from "@/lib/league/fairness";
import { z } from "zod";

const requestSchema = z.object({
  weekNumber: z.number().int().positive(),
  confirm: z.boolean().default(false),
});

async function authorized(userId: string) {
  const profile = await db.query.users.findFirst({ where: eq(users.id, userId) });
  return profile?.role === "admin" || profile?.role === "captain";
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !(await authorized(user.id))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = requestSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const season = await db.query.seasons.findFirst({ where: eq(seasons.isActive, true) });
  if (!season) return NextResponse.json({ error: "No active season" }, { status: 409 });

  const slots = await db.query.availabilitySlots.findMany({
    where: and(eq(availabilitySlots.seasonId, season.id), eq(availabilitySlots.weekNumber, parsed.data.weekNumber)),
    orderBy: [asc(availabilitySlots.slotDate), asc(availabilitySlots.createdAt)],
  });
  const existingMatches = await db.query.matches.findMany({
    where: and(eq(matches.seasonId, season.id), eq(matches.weekNumber, parsed.data.weekNumber)),
    with: { pairings: true },
  });
  const roster = await db
    .select({ id: players.id, firstName: players.firstName, lastName: players.lastName })
    .from(seasonPlayers)
    .innerJoin(players, eq(players.id, seasonPlayers.playerId))
    .where(and(eq(seasonPlayers.seasonId, season.id), eq(players.isActive, true)));
  const slotIds = slots.map((slot) => slot.id);
  const availability = slotIds.length
    ? await db.select({ slotId: playerAvailability.slotId, playerId: playerAvailability.playerId, status: playerAvailability.status })
      .from(playerAvailability).where(inArray(playerAvailability.slotId, slotIds))
    : [];
  const availabilityBySlot = new Map<string, typeof availability>();
  for (const row of availability) availabilityBySlot.set(row.slotId, [...(availabilityBySlot.get(row.slotId) ?? []), row]);
  const assignedByPlayer = new Map<string, number>();
  const seasonAssignedByPlayer = new Map<string, number>();
  for (const match of await db.query.matches.findMany({ where: eq(matches.seasonId, season.id), with: { pairings: true } })) {
    if (match.status === "cancelled" || match.status === "abandoned") continue;
    const ids = match.pairings.flatMap((pairing) => [pairing.team1Player1Id, pairing.team1Player2Id, pairing.team2Player1Id, pairing.team2Player2Id]).filter(Boolean) as string[];
    for (const id of ids) {
      seasonAssignedByPlayer.set(id, (seasonAssignedByPlayer.get(id) ?? 0) + 1);
      if (match.weekNumber === parsed.data.weekNumber) assignedByPlayer.set(id, (assignedByPlayer.get(id) ?? 0) + 1);
    }
  }
  const takenSlotIds = new Set(existingMatches.map((match) => match.slotId).filter(Boolean));
  const assignments: Array<{ slotId: string; label: string; playerIds: string[]; playerNames: string[] }> = [];
  const skipped: Array<{ slotId: string; label: string; reason: string }> = [];

  for (const slot of slots) {
    if (takenSlotIds.has(slot.id)) {
      skipped.push({ slotId: slot.id, label: slot.label, reason: "match already assigned" });
      continue;
    }
    const candidates = (availabilityBySlot.get(slot.id) ?? [])
      .filter((row) => row.status === "available" || row.status === "maybe")
      .map((row) => {
        const player = roster.find((entry) => entry.id === row.playerId);
        const weeklyAvailability = availability.filter((entry) => entry.playerId === row.playerId).length;
        return player ? {
          playerId: player.id,
          name: `${player.firstName} ${player.lastName}`,
          status: String(row.status),
          weeklyGames: assignedByPlayer.get(player.id) ?? 0,
          seasonGames: seasonAssignedByPlayer.get(player.id) ?? 0,
          weeklyAvailability,
        } : null;
      }).filter((candidate): candidate is FairnessCandidate => Boolean(candidate));
    const selected = pickFairCandidates(candidates, 4);
    if (selected.length < 4) {
      skipped.push({ slotId: slot.id, label: slot.label, reason: `only ${selected.length} available (need 4)` });
      continue;
    }
    assignments.push({ slotId: slot.id, label: slot.label, playerIds: selected.map((candidate) => candidate.playerId), playerNames: selected.map((candidate) => candidate.name) });
    selected.forEach((candidate) => assignedByPlayer.set(candidate.playerId, (assignedByPlayer.get(candidate.playerId) ?? 0) + 1));
  }

  if (parsed.data.confirm) {
    for (const assignment of assignments) {
      const inserted = await db.transaction(async (tx) => {
        const slot = slots.find((entry) => entry.id === assignment.slotId)!;
        const existing = await tx.query.matches.findFirst({ where: and(eq(matches.slotId, slot.id), eq(matches.seasonId, season.id)) });
        if (existing) return existing.id;
        const next = await tx.select({ value: sql<number>`coalesce(max(${matches.matchNumber}), 0) + 1` }).from(matches).where(eq(matches.seasonId, season.id));
        const created = await tx.insert(matches).values({ seasonId: season.id, slotId: slot.id, weekNumber: slot.weekNumber, matchNumber: Number(next[0]?.value ?? 1), status: "scheduled" }).returning({ id: matches.id });
        const matchId = created[0]!.id;
        await tx.insert(matchPairings).values({ matchId, team1Player1Id: assignment.playerIds[0], team1Player2Id: assignment.playerIds[1], team2Player1Id: assignment.playerIds[2], team2Player2Id: assignment.playerIds[3] });
        await tx.insert(auditEvents).values({ actorId: user.id, action: "match_assign", resourceType: "match", resourceId: matchId, metadata: { weekAutoAssign: true, slotId: slot.id, playerIds: assignment.playerIds } });
        return matchId;
      });
      if (!inserted) return NextResponse.json({ error: "Failed to create a match" }, { status: 500 });
    }
  }
  return NextResponse.json({ assignments, skipped, confirmed: parsed.data.confirm });
}