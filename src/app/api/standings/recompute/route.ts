import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import {
  standingsSnapshots,
  matchSets,
  matchPairings,
  matches,
  seasonPlayers,
  users,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";

async function requireAdmin(userId: string) {
  const profile = await db.query.users.findFirst({ where: eq(users.id, userId) });
  return profile?.role === "admin";
}

/**
 * POST /api/standings/recompute
 * Body: { seasonId: string }
 *
 * Recomputes standings for the given season from match_sets source of truth.
 * Only processes the latest version of each pairing's sets.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await requireAdmin(user.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { seasonId } = await req.json();
  if (!seasonId) return NextResponse.json({ error: "seasonId required" }, { status: 422 });

  // Gather all completed matches in the season
  const seasonMatches = await db.query.matches.findMany({
    where: and(eq(matches.seasonId, seasonId), eq(matches.status, "completed")),
    with: { pairings: { with: { sets: true } } },
  });

  // Tally stats per player
  type Stats = {
    matchesPlayed: number;
    matchesWon: number;
    setsWon: number;
    setsLost: number;
    gamesWon: number;
    gamesLost: number;
  };
  const statsMap = new Map<string, Stats>();

  function ensure(id: string) {
    if (!statsMap.has(id)) {
      statsMap.set(id, {
        matchesPlayed: 0,
        matchesWon: 0,
        setsWon: 0,
        setsLost: 0,
        gamesWon: 0,
        gamesLost: 0,
      });
    }
    return statsMap.get(id)!;
  }

  for (const match of seasonMatches) {
    for (const pairing of match.pairings) {
      // Only use the latest version of sets for this pairing
      const maxVersion = Math.max(...pairing.sets.map((s) => s.version), 0);
      const latestSets = pairing.sets.filter((s) => s.version === maxVersion);

      let t1SetsWon = 0;
      let t2SetsWon = 0;
      let t1Games = 0;
      let t2Games = 0;

      for (const set of latestSets) {
        t1Games += set.team1Games;
        t2Games += set.team2Games;
        if (set.team1Games > set.team2Games) t1SetsWon++;
        else t2SetsWon++;
      }

      const t1Win = t1SetsWon > t2SetsWon;
      const players1 = [pairing.team1Player1Id, pairing.team1Player2Id].filter(Boolean) as string[];
      const players2 = [pairing.team2Player1Id, pairing.team2Player2Id].filter(Boolean) as string[];

      for (const pid of players1) {
        const s = ensure(pid);
        s.matchesPlayed++;
        s.setsWon += t1SetsWon;
        s.setsLost += t2SetsWon;
        s.gamesWon += t1Games;
        s.gamesLost += t2Games;
        if (t1Win) s.matchesWon++;
      }
      for (const pid of players2) {
        const s = ensure(pid);
        s.matchesPlayed++;
        s.setsWon += t2SetsWon;
        s.setsLost += t1SetsWon;
        s.gamesWon += t2Games;
        s.gamesLost += t1Games;
        if (!t1Win) s.matchesWon++;
      }
    }
  }

  // Sort and assign ranks
  const sorted = [...statsMap.entries()].sort(([, a], [, b]) => {
    const pointsA = a.matchesWon * 3;
    const pointsB = b.matchesWon * 3;
    if (pointsB !== pointsA) return pointsB - pointsA;
    return b.setsWon - a.setsWon;
  });

  // Upsert into standings_snapshots
  await Promise.all(
    sorted.map(([playerId, s], i) =>
      db
        .insert(standingsSnapshots)
        .values({
          seasonId,
          playerId,
          ...s,
          points: s.matchesWon * 3,
          rank: i + 1,
        })
        .onConflictDoUpdate({
          target: [standingsSnapshots.seasonId, standingsSnapshots.playerId],
          set: {
            ...s,
            points: s.matchesWon * 3,
            rank: i + 1,
            computedAt: new Date(),
          },
        })
    )
  );

  return NextResponse.json({ ok: true, playersUpdated: sorted.length });
}
