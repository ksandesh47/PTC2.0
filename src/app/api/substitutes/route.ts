import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import {
  matchPairings,
  matches,
  players,
  substituteOffers,
  substituteRequests,
  users,
} from "@/db/schema";
import {
  canTransitionSubstituteOffer,
  canTransitionSubstituteRequest,
  isEligibleSubstitute,
} from "@/lib/league/substitutes";
import { z } from "zod";

const actionSchema = z.object({
  action: z.enum(["request", "cancel", "offer", "withdraw", "confirm"]),
  matchId: z.string().uuid().optional(),
  requestId: z.string().uuid().optional(),
  playerId: z.string().uuid().optional(),
  reason: z.string().trim().max(140).optional(),
});

async function getActor(userId: string) {
  const [profile, player] = await Promise.all([
    db.query.users.findFirst({ where: eq(users.id, userId) }),
    db.query.players.findFirst({ where: eq(players.userId, userId) }),
  ]);
  return { profile, player };
}

function isManager(role: string | undefined) {
  return role === "admin" || role === "captain";
}

async function handleRequest(actorPlayerId: string, input: z.infer<typeof actionSchema>) {
  if (!input.matchId) return { error: "matchId is required", status: 422 };

  const match = await db.query.matches.findFirst({
    where: eq(matches.id, input.matchId),
    with: { pairings: true },
  });
  if (!match) return { error: "Match not found", status: 404 };
  if (match.status === "completed" || match.status === "abandoned" || match.status === "cancelled") {
    return { error: "This match is no longer eligible for a substitute", status: 409 };
  }

  const assigned = match.pairings.some((pairing) =>
    [
      pairing.team1Player1Id,
      pairing.team1Player2Id,
      pairing.team2Player1Id,
      pairing.team2Player2Id,
    ].includes(actorPlayerId)
  );
  if (!assigned) return { error: "Only assigned players can request a substitute", status: 403 };

  const existing = await db.query.substituteRequests.findFirst({
    where: and(
      eq(substituteRequests.matchId, input.matchId),
      eq(substituteRequests.status, "open")
    ),
  });
  if (existing) return { error: "A substitute request is already open for this match", status: 409 };

  const inserted = await db
    .insert(substituteRequests)
    .values({
      seasonId: match.seasonId,
      matchId: match.id,
      requestedBy: actorPlayerId,
      reason: input.reason || null,
    })
    .returning({ id: substituteRequests.id });
  return { requestId: inserted[0]?.id };
}

async function handleOffer(actorPlayerId: string, requestId: string | undefined) {
  if (!requestId) return { error: "requestId is required", status: 422 };
  const request = await db.query.substituteRequests.findFirst({
    where: eq(substituteRequests.id, requestId),
    with: { match: { with: { pairings: true } } },
  });
  if (!request) return { error: "Substitute request not found", status: 404 };
  if (request.status !== "open") return { error: "This request is no longer open", status: 409 };

  const actor = await db.query.players.findFirst({ where: eq(players.id, actorPlayerId) });
  if (!actor?.isActive) return { error: "Only active players can offer to substitute", status: 403 };

  const assignedToMatch = request.match.pairings.some((pairing) =>
    [pairing.team1Player1Id, pairing.team1Player2Id, pairing.team2Player1Id, pairing.team2Player2Id]
      .includes(actorPlayerId)
  );
  const slotMatches = request.match.slotId
    ? await db.query.matches.findMany({
        where: and(eq(matches.seasonId, request.seasonId), eq(matches.slotId, request.match.slotId)),
        with: { pairings: true },
      })
    : [];
  const assignedToSlot = slotMatches.some((match) =>
    match.pairings.some((pairing) =>
      [pairing.team1Player1Id, pairing.team1Player2Id, pairing.team2Player1Id, pairing.team2Player2Id]
        .includes(actorPlayerId)
    )
  );
  if (!isEligibleSubstitute({
    isActive: actor.isActive,
    isAssignedToRequestedMatch: assignedToMatch,
    isAssignedToRequestedSlot: assignedToSlot,
  })) return { error: "You are already assigned in this match or slot", status: 409 };

  const existing = await db.query.substituteOffers.findFirst({
    where: and(
      eq(substituteOffers.requestId, requestId),
      eq(substituteOffers.playerId, actorPlayerId)
    ),
  });
  if (existing) {
    if (existing.status === "pending") return { ok: true, alreadyOffered: true };
    if (!canTransitionSubstituteOffer(existing.status, "pending")) {
      return { error: "This offer cannot be reopened", status: 409 };
    }
    await db.update(substituteOffers).set({ status: "pending", updatedAt: new Date() }).where(eq(substituteOffers.id, existing.id));
    return { ok: true };
  }

  await db.insert(substituteOffers).values({ requestId, playerId: actorPlayerId });
  return { ok: true };
}

async function handleCancel(actorPlayerId: string, requestId: string | undefined, isManagerActor: boolean) {
  if (!requestId) return { error: "requestId is required", status: 422 };
  const result = await db.transaction(async (tx) => {
    const request = await tx.query.substituteRequests.findFirst({ where: eq(substituteRequests.id, requestId) });
    if (!request) return { error: "Substitute request not found", status: 404 };
    if (!isManagerActor && request.requestedBy !== actorPlayerId) {
      return { error: "Only the requester or a manager can cancel this request", status: 403 };
    }
    if (!canTransitionSubstituteRequest(request.status, "cancelled")) return { error: "This request is no longer open", status: 409 };
    await tx.update(substituteRequests).set({ status: "cancelled", updatedAt: new Date() }).where(eq(substituteRequests.id, requestId));
    await tx.update(substituteOffers).set({ status: "not_needed", updatedAt: new Date() }).where(and(eq(substituteOffers.requestId, requestId), eq(substituteOffers.status, "pending")));
    return { ok: true };
  });
  return result;
}

async function handleWithdraw(actorPlayerId: string, requestId: string | undefined) {
  if (!requestId) return { error: "requestId is required", status: 422 };
  const offer = await db.query.substituteOffers.findFirst({
    where: and(eq(substituteOffers.requestId, requestId), eq(substituteOffers.playerId, actorPlayerId), eq(substituteOffers.status, "pending")),
  });
  if (!offer) return { error: "No pending offer found", status: 404 };
  await db.update(substituteOffers).set({ status: "withdrawn", updatedAt: new Date() }).where(eq(substituteOffers.id, offer.id));
  return { ok: true };
}

async function handleConfirm(actorPlayerId: string, isManagerActor: boolean, requestId: string | undefined, selectedPlayerId: string | undefined) {
  if (!requestId || !selectedPlayerId) return { error: "requestId and playerId are required", status: 422 };
  return db.transaction(async (tx) => {
    const request = await tx.query.substituteRequests.findFirst({
      where: eq(substituteRequests.id, requestId),
      with: { match: { with: { pairings: true } } },
    });
    if (!request) return { error: "Substitute request not found", status: 404 };
    if (!isManagerActor && request.requestedBy !== actorPlayerId) return { error: "Only the requester or a manager can confirm", status: 403 };

    const offer = await tx.query.substituteOffers.findFirst({
      where: and(
        eq(substituteOffers.requestId, requestId),
        eq(substituteOffers.playerId, selectedPlayerId),
        eq(substituteOffers.status, "pending")
      ),
    });
    if (!offer) return { error: "Selected player has no pending offer", status: 404 };

    const claimed = await tx.update(substituteRequests)
      .set({ status: "filled", filledBy: selectedPlayerId, updatedAt: new Date() })
      .where(and(eq(substituteRequests.id, requestId), eq(substituteRequests.status, "open")))
      .returning({ id: substituteRequests.id });
    if (claimed.length === 0) return { error: "This request is no longer open", status: 409 };

    const pairing = request.match.pairings.find((candidate) =>
      [candidate.team1Player1Id, candidate.team1Player2Id, candidate.team2Player1Id, candidate.team2Player2Id]
        .includes(request.requestedBy)
    );
    if (!pairing) return { error: "Requester is no longer assigned to this match", status: 409 };
    const field = pairing.team1Player1Id === request.requestedBy ? "team1Player1Id"
      : pairing.team1Player2Id === request.requestedBy ? "team1Player2Id"
      : pairing.team2Player1Id === request.requestedBy ? "team2Player1Id" : "team2Player2Id";
    await tx.update(matchPairings).set({ [field]: selectedPlayerId }).where(eq(matchPairings.id, pairing.id));
    await tx.update(substituteOffers).set({ status: "selected", updatedAt: new Date() }).where(eq(substituteOffers.id, offer.id));
    await tx.update(substituteOffers).set({ status: "not_needed", updatedAt: new Date() }).where(and(eq(substituteOffers.requestId, requestId), eq(substituteOffers.status, "pending")));
    return { ok: true, filledBy: selectedPlayerId };
  });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = actionSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const { profile, player } = await getActor(user.id);
  const isManagerActor = isManager(profile?.role);
  if (!player && !(isManagerActor && ["cancel", "confirm"].includes(parsed.data.action))) {
    return NextResponse.json({ error: "Player profile is not linked" }, { status: 403 });
  }
  const actorPlayerId = player?.id ?? "";

  let result: { error?: string; status?: number; [key: string]: unknown };
  if (parsed.data.action === "request") result = await handleRequest(actorPlayerId, parsed.data);
  else if (parsed.data.action === "offer") result = await handleOffer(actorPlayerId, parsed.data.requestId);
  else if (parsed.data.action === "cancel") result = await handleCancel(actorPlayerId, parsed.data.requestId, isManagerActor);
  else if (parsed.data.action === "withdraw") result = await handleWithdraw(actorPlayerId, parsed.data.requestId);
  else result = await handleConfirm(actorPlayerId, isManagerActor, parsed.data.requestId, parsed.data.playerId);

  if (result.error) return NextResponse.json({ error: result.error }, { status: result.status ?? 409 });
  return NextResponse.json(result);
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { profile, player } = await getActor(user.id);
  if (!player) return NextResponse.json({ error: "Player profile is not linked" }, { status: 403 });

  const requests = await db.query.substituteRequests.findMany({
    with: {
      requester: { columns: { firstName: true, lastName: true } },
      match: { with: { slot: true, pairings: true } },
      offers: {
        with: { player: { columns: { firstName: true, lastName: true } } },
      },
    },
    orderBy: (table, { desc }) => [desc(table.createdAt)],
  });
  const isManagerActor = isManager(profile?.role);
  const visible = requests.filter((request) => {
    if (isManagerActor) return true;
    return request.status === "open";
  });

  return NextResponse.json(
    visible.map((request) => ({
      id: request.id,
      matchId: request.matchId,
      status: request.status,
      reason: request.reason,
      requestedBy: request.requestedBy,
      requesterName: `${request.requester.firstName} ${request.requester.lastName}`.trim(),
      filledBy: request.filledBy,
      slot: request.match.slot
        ? { id: request.match.slot.id, label: request.match.slot.label, date: request.match.slot.slotDate }
        : null,
      offers: request.offers.map((offer) => ({
        id: offer.id,
        playerId: offer.playerId,
        status: offer.status,
        playerName: `${offer.player.firstName} ${offer.player.lastName}`.trim(),
        offeredAt: offer.offeredAt,
      })),
    }))
  );
}
