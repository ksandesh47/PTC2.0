"use server";

import { db } from "@/db";
import { seasons, availabilitySlots } from "@/db/schema";
import { eq, gte, lte, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

function toDateOnly(value: string): Date | null {
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function eachDateInclusive(startStr: string, endStr: string): Date[] {
  const start = toDateOnly(startStr);
  const end = toDateOnly(endStr);
  if (!start || !end) return [];
  const result: Date[] = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    result.push(new Date(d));
  }
  return result;
}

function buildSlotLabel(d: Date, timeStr: string): string {
  const day = d.toLocaleDateString("en-US", { weekday: "short" });
  return `${day} - ${timeStr}`;
}

export async function updateAvailabilityWindow(seasonId: string, startDate: string, endDate: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
    throw new Error("Availability dates must be valid dates");
  }

  if (startDate > endDate) {
    throw new Error("Availability start date must be before the end date");
  }

  const season = await db.query.seasons.findFirst({
    where: eq(seasons.id, seasonId),
    columns: { startDate: true, endDate: true },
  });
  if (!season) throw new Error("Season not found");
  if (startDate < season.startDate || endDate > season.endDate) {
    throw new Error("Availability window must stay within the season dates");
  }

  const allDays = eachDateInclusive(startDate, endDate);
  let desiredSlots: Array<{ seasonId: string; label: string; slotDate: string; weekNumber: number }> = [];
  const start = toDateOnly(startDate);
  if (!start) return;

  for (const day of allDays) {
    const iso = toIsoDate(day);
    const weekNumber = Math.floor((day.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
    const dow = day.getDay();
    if (dow >= 1 && dow <= 5) {
      desiredSlots = [
        ...desiredSlots,
        {
          seasonId,
          label: buildSlotLabel(day, "5:30 PM"),
          slotDate: iso,
          weekNumber,
        },
      ];
    } else {
      desiredSlots = [
        ...desiredSlots,
        {
          seasonId,
          label: buildSlotLabel(day, "8:30 AM"),
          slotDate: iso,
          weekNumber,
        },
        {
          seasonId,
          label: buildSlotLabel(day, "11:00 AM"),
          slotDate: iso,
          weekNumber,
        },
      ];
    }
  }

  const existing = await db.query.availabilitySlots.findMany({
    where: and(
      eq(availabilitySlots.seasonId, seasonId),
      gte(availabilitySlots.slotDate, startDate),
      lte(availabilitySlots.slotDate, endDate)
    ),
    columns: { label: true, slotDate: true },
  });

  const existingKeys = new Set(existing.map((s) => `${s.slotDate}|${s.label}`));
  const missing = desiredSlots.filter((s) => !existingKeys.has(`${s.slotDate}|${s.label}`));
  if (missing.length > 0) {
    await db.insert(availabilitySlots).values(missing);
  }

  await db
    .update(seasons)
    .set({
      availabilityWindowStart: startDate,
      availabilityWindowEnd: endDate,
      updatedAt: new Date(),
    })
    .where(eq(seasons.id, seasonId));

  revalidatePath("/admin");
  revalidatePath("/admin/availability");
  revalidatePath("/player/availability");
}
