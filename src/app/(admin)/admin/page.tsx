import { db } from "@/db";
import { matches, players, seasons, auditEvents } from "@/db/schema";
import { eq, desc, count, sql, inArray } from "drizzle-orm";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { AvailabilityWindowControl } from "@/components/admin/AvailabilityWindowControl";
import { DashboardRetryControl } from "@/components/admin/DashboardRetryControl";

type DashboardIssue = {
  section: string;
  reason: string;
};

function formatErrorReason(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Unknown error";
}

function formatCronRun(event: { createdAt: Date } | undefined) {
  if (!event) return "Never recorded";
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(event.createdAt));
}

async function checkDbHealth(): Promise<{ ok: boolean; latencyMs: number }> {
  const t0 = Date.now();
  try {
    await db.select({ ping: sql<number>`1` }).from(seasons).limit(1);
    return { ok: true, latencyMs: Date.now() - t0 };
  } catch {
    return { ok: false, latencyMs: -1 };
  }
}

async function computeDataHealth(seasonId: string) {
  try {
    // Match-level integrity checks - load all matches with pairings and sets
    const seasonMatches = await db.query.matches.findMany({
      where: eq(matches.seasonId, seasonId),
      with: {
        pairings: { with: { sets: true } },
      },
    });

    const issues: string[] = [];
    let matchesWithoutSlot = 0;
    let cancelledWithSets = 0;
    let scheduledPastNoScores = 0;
    let completedWithoutSets = 0;

    for (const match of seasonMatches) {
      if (!match.slotId) matchesWithoutSlot += 1;
      const setCount = match.pairings.reduce((sum, p) => sum + p.sets.length, 0);
      if ((match.status === "cancelled" || match.status === "abandoned") && setCount > 0) {
        cancelledWithSets += 1;
      }
      if (match.status === "completed" && setCount === 0) {
        completedWithoutSets += 1;
      }
      if ((match.status === "scheduled" || match.status === "in_progress") && setCount === 0) {
        scheduledPastNoScores += 1;
      }
    }

    if (matchesWithoutSlot > 0) issues.push(`${matchesWithoutSlot} match(es) missing a slot`);
    if (cancelledWithSets > 0) issues.push(`${cancelledWithSets} canceled match(es) still have sets recorded`);
    if (scheduledPastNoScores > 0) issues.push(`${scheduledPastNoScores} unscored match(es)`);
    if (completedWithoutSets > 0) issues.push(`${completedWithoutSets} completed match(es) with no sets`);

    return { issues, scheduledPastNoScores };
  } catch (error) {
    console.error("Error computing data health:", error);
    return { issues: [], scheduledPastNoScores: 0 };
  }
}

export default async function AdminDashboardPage() {
  try {
  const [
    activeSeasonResult,
    totalPlayersResult,
    recentAuditResult,
    dbHealthResult,
    lastCronResult,
  ] = await Promise.allSettled([
    db.query.seasons.findFirst({ where: eq(seasons.isActive, true) }),
    db.select({ count: count() }).from(players).where(eq(players.isActive, true)),
    db.query.auditEvents.findMany({
      orderBy: [desc(auditEvents.createdAt)],
      limit: 10,
    }),
    checkDbHealth(),
    db.query.auditEvents.findMany({
      where: inArray(auditEvents.resourceType, ["cron:keepalive", "keepalive", "cron:substitute-autofill"]),
      orderBy: [desc(auditEvents.createdAt)],
      limit: 3,
    }),
  ]);

  const queryFailures: DashboardIssue[] = [];

  if (activeSeasonResult.status === "rejected") {
    console.error("Dashboard: failed to load active season", activeSeasonResult.reason);
    queryFailures.push({ section: "active season", reason: formatErrorReason(activeSeasonResult.reason) });
  }
  if (totalPlayersResult.status === "rejected") {
    console.error("Dashboard: failed to load players count", totalPlayersResult.reason);
    queryFailures.push({ section: "player counts", reason: formatErrorReason(totalPlayersResult.reason) });
  }
  if (recentAuditResult.status === "rejected") {
    console.error("Dashboard: failed to load recent activity", recentAuditResult.reason);
    queryFailures.push({ section: "recent activity", reason: formatErrorReason(recentAuditResult.reason) });
  }
  if (dbHealthResult.status === "rejected") {
    console.error("Dashboard: failed to run DB health check", dbHealthResult.reason);
    queryFailures.push({ section: "database health", reason: formatErrorReason(dbHealthResult.reason) });
  }
  if (lastCronResult.status === "rejected") {
    console.error("Dashboard: failed to load cron history", lastCronResult.reason);
    queryFailures.push({ section: "cron history", reason: formatErrorReason(lastCronResult.reason) });
  }

  const activeSeason = activeSeasonResult.status === "fulfilled" ? activeSeasonResult.value : null;
  const totalPlayersCount =
    totalPlayersResult.status === "fulfilled" ? (totalPlayersResult.value[0]?.count ?? 0) : 0;
  const recentAudit = recentAuditResult.status === "fulfilled" ? recentAuditResult.value : [];
  const dbHealth =
    dbHealthResult.status === "fulfilled"
      ? dbHealthResult.value
      : { ok: false, latencyMs: -1 };
  const cronRuns = lastCronResult.status === "fulfilled" ? lastCronResult.value : [];
  const lastDailyCron = cronRuns.find((event) => event.resourceType === "cron:substitute-autofill");
  const lastKeepalive = cronRuns.find((event) => event.resourceType === "cron:keepalive" || event.resourceType === "keepalive");

  let matchStats: Array<{ status: typeof matches.$inferSelect.status; count: number }> = [];
  if (activeSeason) {
    try {
      matchStats = await db
        .select({ status: matches.status, count: count() })
        .from(matches)
        .where(eq(matches.seasonId, activeSeason.id))
        .groupBy(matches.status);
    } catch (error) {
      console.error("Dashboard: failed to load match stats", error);
      queryFailures.push({ section: "match stats", reason: formatErrorReason(error) });
    }
  }

  const scheduled = matchStats.find((r) => r.status === "scheduled")?.count ?? 0;
  const completed = matchStats.find((r) => r.status === "completed")?.count ?? 0;

  const dataHealth = activeSeason
    ? await computeDataHealth(activeSeason.id).catch((error) => {
        console.error("Dashboard: failed to compute data health", error);
        queryFailures.push({ section: "data health", reason: formatErrorReason(error) });
        return {
          issues: ["Unable to compute data health"],
          scheduledPastNoScores: 0,
        };
      })
    : { issues: [] as string[], scheduledPastNoScores: 0 };

  const lastKeepaliveLabel = lastKeepalive
    ? new Intl.DateTimeFormat("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }).format(new Date(lastKeepalive.createdAt))
    : "Never recorded";

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-5xl">
      <div>
        <h1 className="font-display text-4xl tracking-widest text-(--color-navy-500)">
          DASHBOARD
        </h1>
        {activeSeason && (
          <p className="text-sm text-(--color-text-muted) mt-1">
            Active season: <strong>{activeSeason.name}</strong> &middot;{" "}
            {formatDate(activeSeason.startDate)} – {formatDate(activeSeason.endDate)}
          </p>
        )}
      </div>

      {queryFailures.length > 0 && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold">Some dashboard data is temporarily unavailable</p>
              <p className="text-xs opacity-80 mt-0.5">
                Partial data shown. Affected sections: {queryFailures.map((x) => x.section).join(", ")}.
              </p>
            </div>
            <DashboardRetryControl />
          </div>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Active Players", value: totalPlayersCount },
          { label: "Matches Scheduled", value: scheduled },
          { label: "Matches Completed", value: completed },
          { label: "Season", value: activeSeason?.name ?? "—" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg border border-(--color-border) border-l-4 border-l-(--color-forest-400) bg-(--color-surface) p-4"
          >
            <p className="text-xs uppercase tracking-widest text-(--color-text-muted)">
              {stat.label}
            </p>
            <p className="mt-1 font-display text-3xl tracking-wider text-(--color-navy-600)">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* DB health banner */}
      <div className={`flex items-center justify-between rounded-lg border px-4 py-3 text-sm ${
        dbHealth.ok
          ? "border-(--color-forest-200) bg-(--color-forest-50) text-(--color-forest-700)"
          : "border-red-200 bg-red-50 text-red-700"
      }`}>
        <div className="flex items-center gap-2">
          <span className={`inline-block h-2 w-2 rounded-full ${dbHealth.ok ? "bg-(--color-forest-500)" : "bg-red-500"}`} />
          <span className="font-semibold">
            Database {dbHealth.ok ? "connected" : "unavailable"}
          </span>
          {dbHealth.ok && (
            <span className="text-xs opacity-70">{dbHealth.latencyMs} ms</span>
          )}
        </div>
        <span className="text-xs opacity-70">
          Daily auto-fill: 11:00 UTC via cron · Last run: {formatCronRun(lastDailyCron)}
          <span className="mx-1">·</span>
          Weekly keepalive: Mon 10:00 UTC · Last run: {lastKeepaliveLabel}
        </span>
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="font-display text-2xl tracking-wider mb-3">QUICK ACTIONS</h2>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin/matches"
            className="rounded-md bg-(--color-accent) px-4 py-2 text-sm font-semibold text-white hover:bg-(--color-accent-hover) transition-colors"
          >
            Build Matches
          </Link>
          <Link
            href="/admin/scores"
            className="rounded-md border border-(--color-border) px-4 py-2 text-sm font-semibold hover:bg-(--color-navy-50) transition-colors"
          >
            Enter Scores
          </Link>
          <Link
            href="/admin/players"
            className="rounded-md border border-(--color-border) px-4 py-2 text-sm font-semibold hover:bg-(--color-navy-50) transition-colors"
          >
            Manage Players
          </Link>
          <Link
            href="/admin/availability"
            className="rounded-md border border-(--color-border) px-4 py-2 text-sm font-semibold hover:bg-(--color-navy-50) transition-colors"
          >
            View Availability
          </Link>
          <Link
            href="/admin/seasons"
            className="rounded-md border border-(--color-border) px-4 py-2 text-sm font-semibold hover:bg-(--color-navy-50) transition-colors"
          >
            Manage Seasons
          </Link>
        </div>
      </div>

      {/* Availability window control */}
      {activeSeason && (
        <AvailabilityWindowControl
          seasonId={activeSeason.id}
          startDate={String(activeSeason.availabilityWindowStart ?? activeSeason.startDate)}
          endDate={String(activeSeason.availabilityWindowEnd ?? activeSeason.endDate)}
        />
      )}

      {/* Recent audit log */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-2xl tracking-wider">RECENT ACTIVITY</h2>
          <Link href="/admin/audit" className="text-sm text-(--color-navy-600) hover:underline">
            View all →
          </Link>
        </div>
        <div className="rounded-lg border border-(--color-border) bg-(--color-surface) divide-y divide-(--color-border)">
          {recentAudit.length === 0 && (
            <p className="px-4 py-6 text-sm text-(--color-text-muted)">No activity yet.</p>
          )}
          {recentAudit.map((event) => (
            <div key={event.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-(--color-navy-600)">
                  {event.action}
                </span>{" "}
                <span className="text-sm text-(--color-text-muted)">
                  {event.resourceType} {event.resourceId?.slice(0, 8)}…
                </span>
              </div>
              <span className="text-xs text-(--color-text-muted)">
                {formatDate(event.createdAt)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {queryFailures.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <p className="font-semibold">Dashboard Load Diagnostics</p>
          <p className="text-xs opacity-80 mt-0.5">
            These are runtime errors for this page load. If they persist, check server logs.
          </p>
          <ul className="mt-2 space-y-1 text-xs">
            {queryFailures.map((issue) => (
              <li key={`${issue.section}:${issue.reason}`}>• {issue.section}: {issue.reason}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Data integrity summary */}
      {(() => {
        const issueCount = dataHealth.issues.length;
        const plural = issueCount === 1 ? "" : "s";
        const heading = issueCount === 0 ? "Data Health" : `Data Health · ${issueCount} issue${plural}`;
        return (
          <div className={`rounded-lg border px-4 py-3 text-sm ${
            issueCount === 0
              ? "border-(--color-forest-200) bg-(--color-forest-50) text-(--color-forest-700)"
              : "border-yellow-200 bg-yellow-50 text-yellow-800"
          }`}>
            <p className="font-semibold">{heading}</p>
            {issueCount === 0 ? (
              <p className="text-xs opacity-80 mt-0.5">
                No data integrity issues detected in matches, pairings, and scores for the active season.
              </p>
            ) : (
              <ul className="mt-1 space-y-0.5 text-xs">
                {dataHealth.issues.map((issue) => (
                  <li key={issue}>• {issue}</li>
                ))}
              </ul>
            )}
          </div>
        );
      })()}

      {/* Past scheduled matches missing scores */}
      {dataHealth.scheduledPastNoScores > 0 && (
        <Link
          href="/admin/scores"
          className="block rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800 hover:bg-yellow-100"
        >
          <p className="font-semibold">
            ⚠ Past Scheduled Matches Missing Scores: {dataHealth.scheduledPastNoScores}
          </p>
          <p className="text-xs opacity-80 mt-0.5">Open Score Entry to record scores →</p>
        </Link>
      )}
    </div>
  );
  } catch (error) {
    console.error("Admin dashboard load failed:", error);
    return (
      <div className="p-6 lg:p-8 max-w-5xl space-y-3">
        <h1 className="font-display text-4xl tracking-widest text-(--color-navy-500)">DASHBOARD</h1>
        <p className="text-sm text-(--color-text-muted)">
          Data is temporarily unavailable. Please refresh or try again in a moment.
        </p>
        <div className="flex flex-wrap gap-3 text-sm">
          <Link href="/admin/scores" className="rounded-md border border-(--color-border) px-3 py-1.5 font-semibold hover:bg-(--color-navy-50)">
            Open Score Entry
          </Link>
          <Link href="/schedule" className="rounded-md border border-(--color-border) px-3 py-1.5 font-semibold hover:bg-(--color-navy-50)">
            Open Public Schedule
          </Link>
        </div>
      </div>
    );
  }
}
