import { db } from "@/db";
import { auditEvents } from "@/db/schema";
import { desc } from "drizzle-orm";
import { formatDate } from "@/lib/utils";

export default async function AdminAuditPage() {
  const events = await db.query.auditEvents.findMany({
    orderBy: [desc(auditEvents.createdAt)],
    limit: 200,
  });

  return (
    <div className="p-6 lg:p-8 max-w-5xl space-y-4">
      <h1 className="font-display text-4xl tracking-widest text-[--color-clay-500]">AUDIT LOG</h1>
      <div className="rounded-lg border border-[--color-border] bg-[--color-surface] divide-y divide-[--color-border]">
        {events.length === 0 && <p className="px-4 py-6 text-sm text-[--color-text-muted]">No activity yet.</p>}
        {events.map((event) => (
          <div key={event.id} className="px-4 py-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[--color-clay-600]">{event.action}</p>
              <p className="text-sm text-[--color-text-muted]">{event.resourceType} {event.resourceId?.slice(0, 8)}…</p>
            </div>
            <span className="text-xs text-[--color-text-muted]">{formatDate(event.createdAt)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
