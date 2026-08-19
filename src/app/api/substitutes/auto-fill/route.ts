import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import {
  auditEvents,
  matchPairings,
  matches,
  substituteOffers,
  substituteRequests,
  users,
} from "@/db/schema";
import {
  isSubstituteAutoFillDue,
  pickFairestSubstituteOffer,
} from "@/lib/league/substitutes";

const defaultLeadHours = 30;

async function isAuthorized(req: NextRequest) {
  const expectedSecret = (
    process.env.SUBSTITUTE_AUTOFILL_SECRET || process.env.CRON_SECRET || ""
  ).trim();
  const authorization = req.headers.get("authorization") ?? "";
  if (expectedSecret && authorization === `Bearer ${expectedSecret}`) return true;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const profile = await db.query.users.findFirst({ where: eq(users.id, user.id) });
  return profile?.role === "admin" || profile?.role === "captain";
}

function playerIds(pairing: {
  team1Player1Id: string;
  team1Player2Id: string | null;
  team2Player1Id: string;
  team2Player2Id: string | null;
}) {
  return [
    pairing.team1Player1Id,
    pairing.team1Player2Id,
    pairing.team2Player1Id,
    pairing.team2Player2Id,
  ].filter((playerId): playerId is string => !!playerId);
}

export async function POST(req: NextRequest) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const leadHours = Number(process.env.AUTO_FILL_LEAD_HOURS) || defaultLeadHours;
  const utcOffset = String(process.env.CLUB_UTC_OFFSET || "").trim();
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const requests = await db.query.substituteRequests.findMany({
    where: eq(substituteRequests.status, "open"),
    with: {
      match: { with: { slot: true, pairings: true } },
      offers: { with: { player: true } },
    },
  });

  const results = { filled: [] as string[], expired: [] as string[], skipped: [] as Array<{ requestId: string; reason: string }> };

  for (const request of requests) {
    const slotDate = request.match.slot?.slotDate;
    const slotLabel = request.match.slot?.label ?? "";
    if (!slotDate) {
      results.skipped.push({ requestId: request.id, reason: "match has no slot" });
      continue;
    }

    if (String(slotDate) < today) {
      await db.transaction(async (tx) => {
        const changed = await tx.update(substituteRequests)
          .set({ status: "expired", updatedAt: now })
          .where(and(eq(substituteRequests.id, request.id), eq(substituteRequests.status, "open")))
          .returning({ id: substituteRequests.id });
        if (changed.length === 0) return;
        await tx.update(substituteOffers)
          .set({ status: "not_needed", updatedAt: now })
          .where(and(eq(substituteOffers.requestId, request.id), eq(substituteOffers.status, "pending")));
        await tx.insert(auditEvents).values({
          action: "update",
          resourceType: "substitute_request",
          resourceId: request.id,
          metadata: { status: "expired", automated: true },
        });
      });
      results.expired.push(request.id);
      continue;
    }

    if (!isSubstituteAutoFillDue(String(slotDate), slotLabel, now, leadHours, utcOffset)) continue;
    const pendingOffers = request.offers.filter((offer) => offer.status === "pending");
    if (pendingOffers.length === 0) {
      results.skipped.push({ requestId: request.id, reason: "no pending offers" });
      continue;
    }

    const seasonMatches = await db.query.matches.findMany({
      where: eq(matches.seasonId, request.seasonId),
      with: { pairings: true },
    });
    const candidates = pendingOffers.map((offer) => {
      let weekGames = 0;
      let seasonGames = 0;
      for (const seasonMatch of seasonMatches) {
        if (seasonMatch.status === "cancelled" || seasonMatch.status === "abandoned") continue;
        const played = seasonMatch.pairings.some((pairing) => playerIds(pairing).includes(offer.playerId));
        if (!played) continue;
        seasonGames += 1;
        if (seasonMatch.weekNumber === request.match.weekNumber) weekGames += 1;
      }
      return {
        playerId: offer.playerId,
        playerName: `${offer.player.firstName} ${offer.player.lastName}`.trim(),
        weekGames,
        seasonGames,
        offeredAt: offer.offeredAt.toISOString(),
      };
    });
    const selected = pickFairestSubstituteOffer(candidates);
    if (!selected) {
      results.skipped.push({ requestId: request.id, reason: "no eligible offers" });
      continue;
    }

    const filled = await db.transaction(async (tx) => {
      const currentPairings = await tx.query.matchPairings.findMany({
        where: eq(matchPairings.matchId, request.matchId),
      });
      const pairing = currentPairings.find((candidate) => playerIds(candidate).includes(request.requestedBy));
      if (!pairing) return false;
      const pendingOffer = await tx.query.substituteOffers.findFirst({
        where: and(
          eq(substituteOffers.requestId, request.id),
          eq(substituteOffers.playerId, selected.playerId),
          eq(substituteOffers.status, "pending")
        ),
      });
      if (!pendingOffer) return false;

      const claimed = await tx.update(substituteRequests)
        .set({ status: "filled", filledBy: selected.playerId, updatedAt: now })
        .where(and(eq(substituteRequests.id, request.id), eq(substituteRequests.status, "open")))
        .returning({ id: substituteRequests.id });
      if (claimed.length === 0) return false;

      const field = pairing.team1Player1Id === request.requestedBy ? "team1Player1Id"
        : pairing.team1Player2Id === request.requestedBy ? "team1Player2Id"
        : pairing.team2Player1Id === request.requestedBy ? "team2Player1Id" : "team2Player2Id";
      await tx.update(matchPairings).set({ [field]: selected.playerId }).where(eq(matchPairings.id, pairing.id));
      await tx.update(substituteOffers)
        .set({ status: "selected", updatedAt: now })
        .where(and(eq(substituteOffers.requestId, request.id), eq(substituteOffers.playerId, selected.playerId), eq(substituteOffers.status, "pending")));
      await tx.update(substituteOffers)
        .set({ status: "not_needed", updatedAt: now })
        .where(and(eq(substituteOffers.requestId, request.id), eq(substituteOffers.status, "pending")));
      await tx.insert(auditEvents).values({
        action: "update",
        resourceType: "substitute_request",
        resourceId: request.id,
        metadata: { status: "filled", filledBy: selected.playerId, automated: true },
      });
      return true;
    });
    if (filled) results.filled.push(request.id);
    else results.skipped.push({ requestId: request.id, reason: "request changed or requester is no longer assigned" });
  }

  await db.insert(auditEvents).values({
    action: "update",
    resourceType: "cron:substitute-autofill",
    metadata: {
      status: "ok",
      ranAt: now.toISOString(),
      filled: results.filled.length,
      expired: results.expired.length,
      skipped: results.skipped.length,
    },
  });

  return NextResponse.json({ ok: true, ...results, ranAt: now.toISOString() });
}
