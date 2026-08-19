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
  return actor ? `${actor.email} (${actor.role})` : "System / imported data";
}

function formatTimestamp(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(value));
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
  if (event.resourceType === "availability_window" && before && after) {
    return `Availability window was changed by ${actor} from ${before.startDate ?? "unset"} - ${before.endDate ?? "unset"} to ${after.startDate} - ${after.endDate}`;
  }
  if (event.resourceType === "season" && before && after) {
    return `Season dates were changed by ${actor} from ${before.startDate} - ${before.endDate} to ${after.startDate} - ${after.endDate}`;
  }
  if (event.resourceType === "match" && (event.action === "score_entry" || event.action === "score_correction")) {
    return `Score for the match was ${event.action === "score_correction" ? "corrected" : "updated"} by ${actor}`;
  }
  if (event.resourceType === "match" && event.action === "match_abandon") {
    return `Match was canceled by ${actor}`;
  }
  if (event.resourceType === "player" && event.action === "update") {
    return `Player information was updated by ${actor}`;
  }
  if (event.resourceType === "match" && event.action === "match_assign") {
    return `Match players were assigned by ${actor}`;
  }
  return `${event.action.replaceAll("_", " ")} on ${event.resourceType} by ${actor}`;
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
                            <p className="text-xs font-semibold uppercase tracking-wider text-(--color-navy-600)">{event.action.replaceAll("_", " ")}</p>
                            <span className="text-xs text-(--color-text-muted)">{event.resourceType}</span>
                          </div>
                          <p className="mt-1 text-sm font-semibold">{eventDescription(event)}</p>
                          {changes && <p className="text-xs text-(--color-text-muted)">{changes}</p>}
                        </div>
                        <span className="shrink-0 text-right text-xs text-(--color-text-muted)">
                          <span className="block">{formatTimestamp(event.createdAt)}</span>
                          <span className="block">{event.resourceId ?? "No resource ID"}</span>
                        </span>
                      </summary>
                      {(diff || metadata) && (
                        <div className="mt-3 space-y-2 rounded-md bg-(--color-navy-50) p-3 text-xs">
                          {diff && <p className="break-words"><strong>Changes:</strong> {diff}</p>}
                          {metadata && <p className="break-words"><strong>Details:</strong> {metadata}</p>}
                        </div>
                      )}
                    </details>
                  );
                })}
      </div>
    </div>
  );
}
