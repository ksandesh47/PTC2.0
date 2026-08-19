import { db } from "@/db";
import { auditEvents } from "@/db/schema";
import { desc } from "drizzle-orm";
import { formatDate } from "@/lib/utils";

function jsonDetail(value: unknown) {
  if (!value) return null;
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
}

export default async function AdminAuditPage() {
  const events = await db.query.auditEvents.findMany({
    orderBy: [desc(auditEvents.createdAt)],
    limit: 200,
    with: {
      actor: {
        columns: { email: true, role: true },
      },
    },
  });

  return (
    <div className="p-6 lg:p-8 max-w-5xl space-y-4">
            <h1 className="font-display text-4xl tracking-widest text-(--color-navy-500)">AUDIT LOG</h1>
      <div className="rounded-lg border border-(--color-border) bg-(--color-surface) divide-y divide-(--color-border)">
        {events.length === 0 && <p className="px-4 py-6 text-sm text-(--color-text-muted)">No activity yet.</p>}
                {events.map((event) => {
                  const diff = jsonDetail(event.diff);
                  const metadata = jsonDetail(event.metadata);
                  return (
                    <details key={event.id} className="group px-4 py-3">
                      <summary className="flex cursor-pointer list-none items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-xs font-semibold uppercase tracking-wider text-(--color-navy-600)">{event.action.replaceAll("_", " ")}</p>
                            <span className="text-xs text-(--color-text-muted)">{event.resourceType}</span>
                          </div>
                          <p className="mt-1 text-sm font-semibold">
                            {event.actor?.email ?? "System / imported data"}
                            {event.actor?.role ? ` · ${event.actor.role}` : ""}
                          </p>
                          <p className="text-xs text-(--color-text-muted)">{event.resourceId ?? "No resource ID"}</p>
                        </div>
                        <span className="shrink-0 text-xs text-(--color-text-muted)">{formatDate(event.createdAt)}</span>
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
