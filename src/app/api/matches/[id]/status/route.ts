import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { auditEvents, matches, users } from "@/db/schema";
import { matchStatusUpdateSchema } from "@/lib/validators";

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
  await db
    .update(matches)
    .set({
      status,
      abandonReason:
        status === "cancelled" || status === "abandoned"
          ? abandonReason?.trim() || null
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
      abandonReason: status === "cancelled" || status === "abandoned" ? abandonReason ?? null : null,
    },
  });

  return NextResponse.json({ ok: true });
}
