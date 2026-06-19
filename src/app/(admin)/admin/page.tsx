import { db } from "@/db";
import { matches, players, seasons, auditEvents, availabilitySlots } from "@/db/schema";
import { and, eq, desc, count, gte, lte } from "drizzle-orm";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { revalidatePath } from "next/cache";

function toDateOnly(value: string): Date | null {
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toIsoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function buildSlotLabel(day: Date, time: "5:30 PM" | "8:30 AM" | "11:00 AM"): string {
  const dayLabel = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  })
    .format(day)
    .replace(",", "");
  return `${dayLabel} - ${time}`;
}

function eachDateInclusive(startIso: string, endIso: string): Date[] {
  const out: Date[] = [];
  const cur = toDateOnly(startIso);
  const end = toDateOnly(endIso);
  if (!cur || !end) return out;

  while (cur <= end) {
    out.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }

  return out;
}

async function updateAvailabilityWindow(formData: FormData) {
  "use server";

  const rawSeasonId = formData.get("seasonId");
  const rawStartDate = formData.get("startDate");
  const rawEndDate = formData.get("endDate");

  const seasonId = typeof rawSeasonId === "string" ? rawSeasonId.trim() : "";
  const startDate = typeof rawStartDate === "string" ? rawStartDate.trim() : "";
  const endDate = typeof rawEndDate === "string" ? rawEndDate.trim() : "";
  const rawExtendDays = formData.get("extendDays");
  const extendDays = typeof rawExtendDays === "string" ? Number.parseInt(rawExtendDays, 10) : 0;

  if (!seasonId || !startDate || !endDate) return;

  let nextStartDate = startDate;
  let nextEndDate = endDate;

  if (Number.isFinite(extendDays) && extendDays > 0) {
    const parsedEnd = toDateOnly(endDate);
    if (!parsedEnd) return;
    parsedEnd.setDate(parsedEnd.getDate() + extendDays);
    nextEndDate = toIsoDate(parsedEnd);
  }

  if (nextStartDate > nextEndDate) return;

  // Ensure slot rows actually exist for the selected player window.
  const allDays = eachDateInclusive(nextStartDate, nextEndDate);
  const desiredSlots: Array<{ seasonId: string; label: string; slotDate: string; weekNumber: number }> = [];
  const start = toDateOnly(nextStartDate);
  if (!start) return;

  for (const day of allDays) {
    const iso = toIsoDate(day);
    const weekNumber = Math.floor((day.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
    const dow = day.getDay();
    if (dow >= 1 && dow <= 5) {
      desiredSlots.push({
        seasonId,
        label: buildSlotLabel(day, "5:30 PM"),
        slotDate: iso,
        weekNumber,
      });
    } else {
      desiredSlots.push({
        seasonId,
        label: buildSlotLabel(day, "8:30 AM"),
        slotDate: iso,
        weekNumber,
      });
      desiredSlots.push({
        seasonId,
        label: buildSlotLabel(day, "11:00 AM"),
        slotDate: iso,
        weekNumber,
      });
    }
  }

  const existing = await db.query.availabilitySlots.findMany({
    where: and(
      eq(availabilitySlots.seasonId, seasonId),
      gte(availabilitySlots.slotDate, nextStartDate),
      lte(availabilitySlots.slotDate, nextEndDate)
    ),
    columns: {
      label: true,
      slotDate: true,
    },
  });

  const existingKeys = new Set(existing.map((s) => `${s.slotDate}|${s.label}`));
  const missing = desiredSlots.filter((s) => !existingKeys.has(`${s.slotDate}|${s.label}`));
  if (missing.length > 0) {
    await db.insert(availabilitySlots).values(missing);
  }

  await db
    .update(seasons)
    .set({ startDate: nextStartDate, endDate: nextEndDate, updatedAt: new Date() })
    .where(eq(seasons.id, seasonId));

  revalidatePath("/admin");
  revalidatePath("/admin/availability");
  revalidatePath("/player/availability");
}

export default async function AdminDashboardPage() {
  const [activeSeason, totalPlayers, recentAudit] = await Promise.all([
    db.query.seasons.findFirst({ where: eq(seasons.isActive, true) }),
    db.select({ count: count() }).from(players).where(eq(players.isActive, true)),
    db.query.auditEvents.findMany({
      orderBy: [desc(auditEvents.createdAt)],
      limit: 10,
    }),
  ]);

  const matchStats = activeSeason
    ? await db
        .select({ status: matches.status, count: count() })
        .from(matches)
        .where(eq(matches.seasonId, activeSeason.id))
        .groupBy(matches.status)
    : [];

  const scheduled = matchStats.find((r) => r.status === "scheduled")?.count ?? 0;
  const completed = matchStats.find((r) => r.status === "completed")?.count ?? 0;

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-5xl">
      <div>
        <h1 className="font-display text-4xl tracking-widest text-[--color-clay-500]">
          DASHBOARD
        </h1>
        {activeSeason && (
          <p className="text-sm text-[--color-text-muted] mt-1">
            Active season: <strong>{activeSeason.name}</strong> &middot;{" "}
            {formatDate(activeSeason.startDate)} – {formatDate(activeSeason.endDate)}
          </p>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Active Players", value: totalPlayers[0].count },
          { label: "Matches Scheduled", value: scheduled },
          { label: "Matches Completed", value: completed },
          { label: "Season", value: activeSeason?.name ?? "—" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg border border-[--color-border] bg-[--color-surface] p-4"
          >
            <p className="text-xs uppercase tracking-widest text-[--color-text-muted]">
              {stat.label}
            </p>
            <p className="mt-1 font-display text-3xl tracking-wider text-[--color-clay-600]">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="font-display text-2xl tracking-wider mb-3">QUICK ACTIONS</h2>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin/matches"
            className="rounded-md bg-[--color-accent] px-4 py-2 text-sm font-semibold text-white hover:bg-[--color-accent-hover] transition-colors"
          >
            Build Matches
          </Link>
          <Link
            href="/admin/scores"
            className="rounded-md border border-[--color-border] px-4 py-2 text-sm font-semibold hover:bg-[--color-clay-50] transition-colors"
          >
            Enter Scores
          </Link>
          <Link
            href="/admin/players"
            className="rounded-md border border-[--color-border] px-4 py-2 text-sm font-semibold hover:bg-[--color-clay-50] transition-colors"
          >
            Manage Players
          </Link>
          <Link
            href="/admin/availability"
            className="rounded-md border border-[--color-border] px-4 py-2 text-sm font-semibold hover:bg-[--color-clay-50] transition-colors"
          >
            View Availability
          </Link>
          <Link
            href="/admin/seasons"
            className="rounded-md border border-[--color-border] px-4 py-2 text-sm font-semibold hover:bg-[--color-clay-50] transition-colors"
          >
            Manage Seasons
          </Link>
        </div>
      </div>

      {/* Availability window control */}
      {activeSeason && (
        <div className="rounded-lg border border-[--color-border] bg-[--color-surface] p-4 space-y-3">
          <h2 className="font-display text-2xl tracking-wider">AVAILABILITY WINDOW</h2>
          <p className="text-sm text-[--color-text-muted]">
            Admin controls which dates players can submit availability for.
          </p>
          <p className="rounded-md bg-[--color-clay-50] px-3 py-2 text-sm">
            Current player window: <strong>{formatDate(activeSeason.startDate)}</strong> to{" "}
            <strong>{formatDate(activeSeason.endDate)}</strong>
          </p>

          <form action={updateAvailabilityWindow} className="space-y-3">
            <input type="hidden" name="seasonId" value={activeSeason.id} />
            <div className="flex flex-wrap items-end gap-3">
              <label className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-widest text-[--color-text-muted]">From</span>
                <input
                  name="startDate"
                  type="date"
                  defaultValue={String(activeSeason.startDate)}
                  className="rounded-md border border-[--color-border] bg-white px-3 py-2 text-sm"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-widest text-[--color-text-muted]">To</span>
                <input
                  name="endDate"
                  type="date"
                  defaultValue={String(activeSeason.endDate)}
                  className="rounded-md border border-[--color-border] bg-white px-3 py-2 text-sm"
                />
              </label>
              <button
                type="submit"
                className="rounded-md bg-[--color-clay-900] px-4 py-2 text-sm font-semibold text-[--color-accent] hover:opacity-95 transition-opacity"
              >
                Submit Window
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                name="extendDays"
                value="7"
                className="rounded-md border border-[--color-border] px-3 py-1.5 text-sm font-semibold hover:bg-[--color-clay-50]"
              >
                Extend +7 days
              </button>
              <button
                type="submit"
                name="extendDays"
                value="14"
                className="rounded-md border border-[--color-border] px-3 py-1.5 text-sm font-semibold hover:bg-[--color-clay-50]"
              >
                Extend +14 days
              </button>
              <button
                type="submit"
                name="extendDays"
                value="30"
                className="rounded-md border border-[--color-border] px-3 py-1.5 text-sm font-semibold hover:bg-[--color-clay-50]"
              >
                Extend +30 days
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Recent audit log */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-2xl tracking-wider">RECENT ACTIVITY</h2>
          <Link href="/admin/audit" className="text-sm text-[--color-clay-600] hover:underline">
            View all →
          </Link>
        </div>
        <div className="rounded-lg border border-[--color-border] bg-[--color-surface] divide-y divide-[--color-border]">
          {recentAudit.length === 0 && (
            <p className="px-4 py-6 text-sm text-[--color-text-muted]">No activity yet.</p>
          )}
          {recentAudit.map((event) => (
            <div key={event.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-[--color-clay-600]">
                  {event.action}
                </span>{" "}
                <span className="text-sm text-[--color-text-muted]">
                  {event.resourceType} {event.resourceId?.slice(0, 8)}…
                </span>
              </div>
              <span className="text-xs text-[--color-text-muted]">
                {formatDate(event.createdAt)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
