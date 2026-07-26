import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { seasons, users } from "@/db/schema";
import { eq } from "drizzle-orm";

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

// PATCH /api/seasons/[id] — update season dates (admin only)
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
