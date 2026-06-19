import { db } from "@/db";
import { seasons } from "@/db/schema";
import { desc } from "drizzle-orm";
import { formatDate } from "@/lib/utils";

export default async function AdminSeasonsPage() {
  const list = await db.query.seasons.findMany({
    orderBy: [desc(seasons.createdAt)],
    limit: 10,
  });

  return (
    <div className="p-6 lg:p-8 max-w-5xl space-y-4">
      <h1 className="font-display text-4xl tracking-widest text-[--color-clay-500]">SEASONS</h1>
      <div className="rounded-lg border border-[--color-border] bg-[--color-surface] divide-y divide-[--color-border]">
        {list.map((s) => (
          <div key={s.id} className="px-4 py-3 flex items-center justify-between gap-3">
            <div>
              <p className="font-semibold">{s.name}</p>
              <p className="text-xs text-[--color-text-muted]">{formatDate(s.startDate)} - {formatDate(s.endDate)}</p>
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider text-[--color-clay-600]">{s.isActive ? "Active" : "Inactive"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
