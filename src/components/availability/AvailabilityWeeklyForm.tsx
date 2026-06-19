"use client";

import { useMemo, useState } from "react";

type AvailabilityStatus = "available" | "maybe" | "unavailable";

type SlotInput = {
  id: string;
  label: string;
  slotDate: string;
  weekNumber: number;
  status: AvailabilityStatus;
};

type Props = {
  playerId: string;
  slots: SlotInput[];
};

type WeekGroup = {
  key: string;
  title: string;
  slots: SlotInput[];
};

const fmtDay = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
});

const fmtMonthDay = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

function weekStart(dateIso: string): Date {
  const d = new Date(`${dateIso}T00:00:00`);
  const day = d.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  const ws = new Date(d);
  ws.setDate(d.getDate() + offset);
  return ws;
}

function weekEnd(start: Date): Date {
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return end;
}

function weekTitle(dateIso: string): string {
  const start = weekStart(dateIso);
  const end = weekEnd(start);
  return `WEEK OF ${fmtMonthDay.format(start).toUpperCase()} - ${fmtMonthDay.format(end).toUpperCase()}`;
}

export default function AvailabilityWeeklyForm({ playerId, slots }: Props) {
  const [statusBySlot, setStatusBySlot] = useState<Record<string, AvailabilityStatus>>(() => {
    const initial: Record<string, AvailabilityStatus> = {};
    for (const s of slots) initial[s.id] = s.status;
    return initial;
  });

  const groupedWeeks = useMemo<WeekGroup[]>(() => {
    const bucket = new Map<string, WeekGroup>();
    for (const slot of slots) {
      const key = weekStart(slot.slotDate).toISOString().slice(0, 10);
      const current = bucket.get(key);
      if (current) {
        current.slots.push(slot);
      } else {
        bucket.set(key, { key, title: weekTitle(slot.slotDate), slots: [slot] });
      }
    }
    return Array.from(bucket.values()).sort((a, b) => a.key.localeCompare(b.key));
  }, [slots]);

  const selectedCount = useMemo(
    () => Object.values(statusBySlot).filter((s) => s === "available").length,
    [statusBySlot]
  );

  function toggleSlot(slotId: string) {
    setStatusBySlot((prev) => ({
      ...prev,
      [slotId]: prev[slotId] === "available" ? "unavailable" : "available",
    }));
  }

  function setWeekStatus(week: WeekGroup, status: AvailabilityStatus) {
    setStatusBySlot((prev) => {
      const next = { ...prev };
      for (const slot of week.slots) next[slot.id] = status;
      return next;
    });
  }

  if (slots.length === 0) {
    return <p className="text-[--color-text-muted]">No slots defined yet.</p>;
  }

  return (
    <form action="/api/availability" method="POST" className="space-y-6">
      <input type="hidden" name="playerId" value={playerId} />

      <div className="sticky top-14 z-10 flex items-center justify-between rounded-lg border border-[--color-border] bg-[--color-surface] px-4 py-3">
        <p className="text-sm font-semibold text-[--color-text-muted]">Tap slots to toggle your availability</p>
        <p className="text-sm font-semibold text-[--color-clay-600]">{selectedCount} selected</p>
      </div>

      <div className="space-y-6">
        {groupedWeeks.map((week) => (
          <section key={week.key} className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-widest text-[--color-clay-600]">
                {week.title}
              </h2>
              <div className="flex gap-2 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setWeekStatus(week, "available")}
                  className="rounded-md bg-[--color-forest-100] px-2 py-1 text-[--color-forest-700]"
                >
                  All ✓
                </button>
                <button
                  type="button"
                  onClick={() => setWeekStatus(week, "unavailable")}
                  className="rounded-md bg-red-50 px-2 py-1 text-red-700"
                >
                  Clear ✗
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {week.slots.map((slot) => {
                const isSelected = statusBySlot[slot.id] === "available";
                const isWeekend = slot.label.includes("8:30 AM") || slot.label.includes("11:00 AM");
                const displayDate = fmtDay.format(new Date(`${slot.slotDate}T00:00:00`));
                const time = slot.label.split(" - ")[1] ?? "";

                return (
                  <button
                    key={slot.id}
                    type="button"
                    onClick={() => toggleSlot(slot.id)}
                    className={[
                      "flex w-full items-center justify-between rounded-lg border px-3 py-3 text-left transition-colors",
                      isSelected
                        ? "border-[--color-clay-800] bg-[--color-clay-900] text-[--color-accent]"
                        : "border-[--color-border] bg-[--color-surface] text-[--color-text]",
                    ].join(" ")}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={[
                          "inline-flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold",
                          isSelected
                            ? "bg-[--color-accent] text-[--color-clay-900]"
                            : "bg-[--color-border] text-transparent",
                        ].join(" ")}
                      >
                        ✓
                      </span>
                      <div>
                        <div className="font-semibold">{displayDate}</div>
                        <div className={isSelected ? "text-[--color-accent] text-sm" : "text-[--color-text-muted] text-sm"}>
                          {time}
                        </div>
                      </div>
                    </div>
                    {isWeekend && (
                      <span className="rounded-full bg-[--color-border] px-2 py-1 text-[10px] font-semibold uppercase text-[--color-text-muted]">
                        Weekend
                      </span>
                    )}
                    <input type="hidden" name={`slot_${slot.id}`} value={statusBySlot[slot.id] ?? "unavailable"} />
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <button
        type="submit"
        className="w-full rounded-md bg-[--color-clay-900] py-3 text-sm font-bold tracking-wide text-[--color-accent] hover:opacity-95"
      >
        SUBMIT AVAILABILITY ({selectedCount} SLOTS)
      </button>
    </form>
  );
}
