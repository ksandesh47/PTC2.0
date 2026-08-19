import { db } from "@/db";
import { auditEvents } from "@/db/schema";
import { desc, isNotNull } from "drizzle-orm";

function jsonDetail(value: unknown) {
  if (!value) return null;
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
}

function actorLabel(actor: { email: string; role: string } | null) {
  return actor?.email ?? "System / imported data";
}

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(value));
}

function formatDateOnly(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function actionLabel(action: string) {
  return action.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function scoreSummary(diff: Record<string, unknown>) {
  if (!Array.isArray(diff.sets)) return null;
  const scores = diff.sets
    .filter((set): set is Record<string, unknown> => !!set && typeof set === "object")
    .map((set) => `Set ${set.setNumber}: ${set.team1Games ?? "–"}-${set.team2Games ?? "–"}`);
  return scores.length > 0 ? scores.join(" · ") : null;
}

function changeDetails(diff: unknown) {
  if (!diff || typeof diff !== "object") return null;
  const value = diff as Record<string, unknown>;
  const before = value.before && typeof value.before === "object" ? value.before as Record<string, unknown> : null;
  const after = value.after && typeof value.after === "object" ? value.after as Record<string, unknown> : null;
  if (before && after) {
    const fields = [...new Set([...Object.keys(before), ...Object.keys(after)])];
    return fields
      .filter((field) => JSON.stringify(before[field]) !== JSON.stringify(after[field]))
      .map((field) => `${field}: ${String(before[field] ?? "unset")} -> ${String(after[field] ?? "unset")}`)
      .join("; ");
  }
  if ("fromStatus" in value || "toStatus" in value) {
    return `status: ${String(value.fromStatus ?? "unset")} -> ${String(value.toStatus ?? "unset")}`;
  }
  return null;
}

function eventDescription(event: {
  action: string;
  resourceType: string;
  diff: unknown;
  metadata: unknown;
  actor: { email: string; role: string } | null;
}) {
  const actor = actorLabel(event.actor);
  const diff = event.diff && typeof event.diff === "object" ? event.diff as Record<string, unknown> : {};
  const before = diff.before && typeof diff.before === "object" ? diff.before as Record<string, unknown> : null;
  const after = diff.after && typeof diff.after === "object" ? diff.after as Record<string, unknown> : null;
  const date = formatDateOnly(event.createdAt);
  const scores = scoreSummary(diff);
  if (event.resourceType === "availability_window" && before && after) {
    return `Availability window was changed by ${actor} from ${before.startDate ?? "unset"} - ${before.endDate ?? "unset"} to ${after.startDate} - ${after.endDate}`;
  }
  if (event.resourceType === "season" && before && after) {
    return `Season dates were changed by ${actor} from ${before.startDate} - ${before.endDate} to ${after.startDate} - ${after.endDate}`;
  }
  if (event.resourceType === "match" && (event.action === "score_entry" || event.action === "score_correction")) {
    const verb = event.action === "score_correction" ? "corrected" : "entered";
    return `${actor} ${verb} the match score on ${date}${scores ? ` · ${scores}` : ""}`;
  }
  if (event.resourceType === "match" && event.action === "match_abandon") {
    return `${actor} canceled the match on ${date}`;
  }
  if (event.resourceType === "player" && event.action === "update") {
    return `${actor} updated player information on ${date}`;
  }
  if (event.resourceType === "match" && event.action === "match_assign") {
    return `${actor} assigned match players on ${date}`;
  }
  return `${actor} ${event.action.replaceAll("_", " ")} ${event.resourceType} on ${date}`;
}

export default async function AdminAuditPage() {
  const events = await db.query.auditEvents.findMany({
    where: isNotNull(auditEvents.actorId),
    orderBy: [desc(auditEvents.createdAt)],
    limit: 200,
    with: {
      actor: {
        columns: { email: true, role: true },
      },
    },
  });
  const adminEvents = events.filter((event) => event.actor?.role === "admin");

  return (
    <div className="p-6 lg:p-8 max-w-5xl space-y-4">
            <h1 className="font-display text-4xl tracking-widest text-(--color-navy-500)">AUDIT LOG</h1>
      <div className="rounded-lg border border-(--color-border) bg-(--color-surface) divide-y divide-(--color-border)">
        {adminEvents.length === 0 && <p className="px-4 py-6 text-sm text-(--color-text-muted)">No admin activity yet.</p>}
          {adminEvents.map((event) => {
                  const diff = jsonDetail(event.diff);
                  const metadata = jsonDetail(event.metadata);
            const changes = changeDetails(event.diff);
                  return (
                    <details key={event.id} className="group px-4 py-3">
                      <summary className="flex cursor-pointer list-none items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-xs font-semibold uppercase tracking-wider text-(--color-navy-600)">{actionLabel(event.action)}</p>
                            <span className="text-xs text-(--color-text-muted)">{event.resourceType}</span>
                          </div>
                          <p className="mt-1 text-sm font-semibold">{eventDescription(event)}</p>
                          {changes && <p className="text-xs text-(--color-text-muted)">{changes}</p>}
                        </div>
                        <span className="shrink-0 text-right text-xs text-(--color-text-muted)">
                          <span className="block">{formatDateTime(event.createdAt)}</span>
                        </span>
                      </summary>
                      {(diff || metadata) && (
                        <div className="mt-3 space-y-2 rounded-md bg-(--color-navy-50) p-3 text-xs">
                          {event.resourceId && <p className="break-words"><strong>Resource ID:</strong> {event.resourceId}</p>}
                          {diff && <p className="break-words"><strong>Technical changes:</strong> {diff}</p>}
                          {metadata && <p className="break-words"><strong>Technical details:</strong> {metadata}</p>}
                        </div>
                      )}
                    </details>
                  );
                })}
      </div>
    </div>
  );
}
