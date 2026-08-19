import { db } from "@/db";
import { seasons } from "@/db/schema";
import { desc } from "drizzle-orm";
import { formatDate } from "@/lib/utils";
import { SeasonEditForm } from "@/components/admin/SeasonEditForm";
import { SeasonActivateButton, CreateSeasonForm } from "@/components/admin/SeasonManagementControls";
import { AvailabilityWindowControl } from "@/components/admin/AvailabilityWindowControl";

export default async function AdminSeasonsPage() {
  const list = await db.query.seasons.findMany({
    orderBy: [desc(seasons.createdAt)],
  });

  return (
    <div className="p-6 lg:p-8 max-w-5xl space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-4xl tracking-widest text-(--color-navy-500)">SEASONS</h1>
        <p className="text-sm text-(--color-text-muted)">{list.length} total</p>
      </div>

      <CreateSeasonForm />

      <div className="space-y-4">
        {list.map((s) => (
          <section key={s.id} className="rounded-lg border border-(--color-border) bg-(--color-surface) p-4 shadow-sm space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold">{s.name}</p>
                <p className="text-xs text-(--color-text-muted)">
                  {formatDate(s.startDate)} – {formatDate(s.endDate)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <SeasonActivateButton seasonId={s.id} isActive={s.isActive} />
                <SeasonEditForm seasonId={s.id} startDate={s.startDate} endDate={s.endDate} />
              </div>
            </div>
            <AvailabilityWindowControl
              seasonId={s.id}
              startDate={String(s.availabilityWindowStart ?? s.startDate)}
              endDate={String(s.availabilityWindowEnd ?? s.endDate)}
            />
          </section>
        ))}
        {list.length === 0 && (
          <div className="rounded-lg border border-(--color-border) bg-(--color-surface) px-4 py-6 text-center text-sm text-(--color-text-muted)">
            No seasons yet. Create the first one above.
          </div>
        )}
      </div>
    </div>
  );
}
