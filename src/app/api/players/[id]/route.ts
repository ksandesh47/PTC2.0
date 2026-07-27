import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { players, users } from "@/db/schema";
import { eq } from "drizzle-orm";

async function requireAdmin(userId: string) {
  const profile = await db.query.users.findFirst({ where: eq(users.id, userId) });
  return profile?.role === "admin" || profile?.role === "captain";
}

// PATCH /api/players/[id] — update player info (admin only)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: playerId } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await requireAdmin(user.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const updates: Record<string, string | boolean | null> = {};

  if (typeof body.firstName === "string") {
    const fn = body.firstName.trim();
    if (!fn.length) return NextResponse.json({ error: "firstName cannot be empty" }, { status: 422 });
    updates.firstName = fn;
  }
  if (typeof body.lastName === "string") {
    updates.lastName = body.lastName.trim();
  }
  if (typeof body.phone === "string" || body.phone === null) updates.phone = body.phone;
  if (typeof body.email === "string" || body.email === null) updates.email = body.email;
  if (typeof body.ntrpRating === "string" || body.ntrpRating === null) updates.ntrpRating = body.ntrpRating;
  if (typeof body.isActive === "boolean") updates.isActive = body.isActive;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No updates provided" }, { status: 422 });
  }

  try {
    await db.update(players).set({ ...updates, updatedAt: new Date() }).where(eq(players.id, playerId));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating player:", error);
    return NextResponse.json({ error: "Failed to update player" }, { status: 500 });
  }
}
