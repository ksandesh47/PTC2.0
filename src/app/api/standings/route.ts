import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { standingsSnapshots, seasons } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const seasonId = req.nextUrl.searchParams.get("seasonId");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  // Public endpoint — no auth required for reading standings

  let targetSeasonId = seasonId;
  if (!targetSeasonId) {
    const active = await db.query.seasons.findFirst({ where: eq(seasons.isActive, true) });
    targetSeasonId = active?.id ?? null;
  }
  if (!targetSeasonId) {
    return NextResponse.json({ error: "No active season" }, { status: 404 });
  }

  const rows = await db.query.standingsSnapshots.findMany({
    where: eq(standingsSnapshots.seasonId, targetSeasonId),
    with: { player: true },
    orderBy: (t, { desc }) => [desc(t.points), desc(t.setsWon)],
  });

  return NextResponse.json(rows);
}
