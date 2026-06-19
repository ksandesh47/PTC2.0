import { db } from "@/db";
import { matches, players, seasons, auditEvents } from "@/db/schema";
import { eq, desc, count } from "drizzle-orm";
import Link from "next/link";
import { formatDate } from "@/lib/utils";

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
            href="/admin/seasons"
            className="rounded-md border border-[--color-border] px-4 py-2 text-sm font-semibold hover:bg-[--color-clay-50] transition-colors"
          >
            Manage Seasons
          </Link>
        </div>
      </div>

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
