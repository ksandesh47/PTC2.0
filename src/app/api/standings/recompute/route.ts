import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { palominoLeagueRules } from "@/lib/league/rules";
import { recomputeSeasonStandings } from "@/lib/league/recompute-standings";

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

  const result = await recomputeSeasonStandings(seasonId);

  return NextResponse.json({
    ok: true,
    playersUpdated: result?.playersUpdated ?? 0,
    scoringModel: palominoLeagueRules.standings.model,
    fallback: palominoLeagueRules.standings.fallbackLabel,
  });
}
