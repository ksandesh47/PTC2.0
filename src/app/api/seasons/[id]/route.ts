import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { seasons, users, matches } from "@/db/schema";
import { eq, ne, count } from "drizzle-orm";

function normalizeDateInput(value: unknown): string | null {
  if (typeof value !== "string" || value.length === 0) return null;
  // Accept either YYYY-MM-DD or ISO strings and store as DATE string.
  const dateOnly = value.includes("T") ? value.split("T")[0] : value;
  const parsed = new Date(dateOnly);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

async function requireAdmin(userId: string) {
  const profile = await db.query.users.findFirst({ where: eq(users.id, userId) });
  return profile?.role === "admin" || profile?.role === "captain";
}

// PATCH /api/seasons/[id] — update season dates and/or activation (admin only)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: seasonId } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await requireAdmin(user.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();

  // Activation-only path: toggle isActive; if activating, deactivate all others.
  if (typeof body.isActive === "boolean" && body.startDate === undefined && body.endDate === undefined) {
    try {
      if (body.isActive) {
        await db.transaction(async (tx) => {
          await tx.update(seasons).set({ isActive: false, updatedAt: new Date() }).where(ne(seasons.id, seasonId));
          await tx.update(seasons).set({ isActive: true, updatedAt: new Date() }).where(eq(seasons.id, seasonId));
        });
      } else {
        await db.update(seasons).set({ isActive: false, updatedAt: new Date() }).where(eq(seasons.id, seasonId));
      }
      return NextResponse.json({ success: true });
    } catch (error) {
      console.error("Error updating season activation:", error);
      return NextResponse.json({ error: "Failed to update season" }, { status: 500 });
    }
  }

  const startDate = normalizeDateInput(body.startDate);
  const endDate = normalizeDateInput(body.endDate);

  if (!startDate || !endDate) {
    return NextResponse.json({ error: "Missing startDate or endDate" }, { status: 422 });
  }

  if (startDate > endDate) {
    return NextResponse.json({ error: "startDate must be before or equal to endDate" }, { status: 422 });
  }

  try {
    await db
      .update(seasons)
      .set({
        startDate,
        endDate,
        updatedAt: new Date(),
      })
      .where(eq(seasons.id, seasonId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating season:", error);
    return NextResponse.json({ error: "Failed to update season" }, { status: 500 });
  }
}

// DELETE /api/seasons/[id] — remove season (admin only, only if no matches exist)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: seasonId } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await requireAdmin(user.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const [{ matchCount }] = await db
      .select({ matchCount: count() })
      .from(matches)
      .where(eq(matches.seasonId, seasonId));
    if (matchCount > 0) {
      return NextResponse.json({ error: "Cannot delete season with matches" }, { status: 409 });
    }
    await db.delete(seasons).where(eq(seasons.id, seasonId));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting season:", error);
    return NextResponse.json({ error: "Failed to delete season" }, { status: 500 });
  }
}
