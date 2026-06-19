import Link from "next/link";
import { db } from "@/db";
import {
  availabilitySlots,
  matchPairings,
  matches,
  playerAvailability,
  players,
  seasonPlayers,
  seasons,
} from "@/db/schema";
import { and, asc, eq, gte, lte } from "drizzle-orm";
import AvailabilityWeeklyForm from "@/components/availability/AvailabilityWeeklyForm";
import { formatDate } from "@/lib/utils";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type RosterPlayer = { id: string; firstName: string; lastName: string };

type PairRow = {
  status: "scheduled" | "completed" | "cancelled" | "abandoned";
  p1: string;
  p2: string | null;
  p3: string;
  p4: string | null;
};

function toSingle(value: string | string[] | undefined): string | undefined {
  if (!value) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

function initials(name: string): string {
  const tokens = name.trim().split(/\s+/);
  return (tokens[0]?.[0] ?? "").toUpperCase();
}

function displayName(firstName: string, lastName: string) {
  return [firstName, lastName].filter(Boolean).join(" ").trim();
}

function dayWindow(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00`).getTime();
  const end = new Date(`${endDate}T00:00:00`).getTime();
  const diff = Math.round((end - start) / (24 * 60 * 60 * 1000)) + 1;
  return Math.max(diff, 0);
}

function buildStats(roster: RosterPlayer[], pairRows: PairRow[]) {
  const statMap = new Map<string, { played: number; scheduled: number }>();
  for (const p of roster) statMap.set(p.id, { played: 0, scheduled: 0 });

  for (const row of pairRows) {
    const ids = [row.p1, row.p2, row.p3, row.p4].filter(
      (id): id is string => Boolean(id)
    );
    for (const id of ids) {
      const cur = statMap.get(id);
      if (!cur) continue;
      if (row.status === "completed") cur.played += 1;
      if (row.status === "scheduled") cur.scheduled += 1;
    }
  }

  return statMap;
}

export default async function AvailabilityPage({ searchParams }: Readonly<PageProps>) {
  const params = (await searchParams) ?? {};
  const selectedPlayerId = toSingle(params.player);
  const saved = toSingle(params.saved) === "1";
  const error = toSingle(params.error);

  const errorMessageByKey: Record<string, string> = {
    "missing-player": "Select a player before submitting availability.",
    "invalid-player": "The selected player is no longer active.",
    "no-season": "No active season is configured right now.",
    "no-slots": "No slots were submitted. Please select at least one slot.",
  };

  const statusMessage = error ? errorMessageByKey[error] : undefined;

  const activeSeason = await db.query.seasons.findFirst({
    where: eq(seasons.isActive, true),
  });

  if (!activeSeason) {
    return (
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-12">
        <p className="text-sm text-[--color-text-muted]">No active season.</p>
      </div>
    );
  }

  const [roster, pairRows] = await Promise.all([
    db
      .select({ id: players.id, firstName: players.firstName, lastName: players.lastName })
      .from(seasonPlayers)
      .innerJoin(players, eq(players.id, seasonPlayers.playerId))
      .where(and(eq(seasonPlayers.seasonId, activeSeason.id), eq(players.isActive, true)))
      .orderBy(asc(players.firstName), asc(players.lastName)),
    db
      .select({
        status: matches.status,
        p1: matchPairings.team1Player1Id,
        p2: matchPairings.team1Player2Id,
        p3: matchPairings.team2Player1Id,
        p4: matchPairings.team2Player2Id,
      })
      .from(matchPairings)
      .innerJoin(matches, eq(matches.id, matchPairings.matchId))
      .where(eq(matches.seasonId, activeSeason.id)),
  ]);

  const statMap = buildStats(roster, pairRows as PairRow[]);

  const selectedPlayer = roster.find((p) => p.id === selectedPlayerId);
  if (!selectedPlayer) {
    return (
      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-10 space-y-6">
        <div className="flex items-center justify-between text-sm">
          <Link href="/" className="font-semibold text-[--color-clay-600] hover:opacity-90">
            📅 View Schedule & Standings
          </Link>
          <Link href="/admin" className="font-semibold text-[--color-clay-600] hover:opacity-90">
            ⚙ Admin
          </Link>
        </div>

        <div className="rounded-2xl border border-[--color-border] bg-gradient-to-br from-[--color-clay-100] via-[--color-cream] to-white px-6 py-7 shadow-sm">
          <div className="text-center space-y-2">
            <div className="text-3xl">🎾</div>
            <h1 className="font-display text-5xl tracking-widest text-[--color-clay-700]">PALOMINO TENNIS CLUB</h1>
            <p className="text-sm text-[--color-text-muted]">
              Select your name to submit your availability for the next {dayWindow(activeSeason.startDate, activeSeason.endDate)} days.
            </p>
            <p className="text-xs font-semibold uppercase tracking-widest text-[--color-forest-700]">
              {formatDate(activeSeason.startDate)} - {formatDate(activeSeason.endDate)}
            </p>
          </div>
        </div>

        <div className="space-y-2 animate-stagger">
          {roster.map((player) => {
            const stats = statMap.get(player.id) ?? { played: 0, scheduled: 0 };
            const name = displayName(player.firstName, player.lastName);
            return (
              <Link
                key={player.id}
                href={`/availability?player=${player.id}`}
                className="group flex items-center justify-between rounded-xl border border-[--color-border] bg-[--color-surface] px-4 py-3 shadow-sm transition-all hover:-translate-y-0.5 hover:border-[--color-clay-300] hover:shadow-md"
              >
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[--color-clay-100] text-sm font-bold text-[--color-clay-700]">
                    {initials(name)}
                  </span>
                  <div>
                    <p className="font-semibold leading-tight">{name}</p>
                    <p className="text-xs text-[--color-text-muted]">
                      {stats.played}M played · {stats.scheduled} scheduled
                    </p>
                  </div>
                </div>
                <span className="text-sm font-bold text-[--color-text-muted] transition-transform group-hover:translate-x-0.5">
                  →
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    );
  }

  const [slots, existingAvailability] = await Promise.all([
    db.query.availabilitySlots.findMany({
      where: and(
        eq(availabilitySlots.seasonId, activeSeason.id),
        gte(availabilitySlots.slotDate, activeSeason.startDate),
        lte(availabilitySlots.slotDate, activeSeason.endDate)
      ),
      orderBy: (t, { asc }) => [asc(t.weekNumber), asc(t.slotDate), asc(t.label)],
    }),
    db.query.playerAvailability.findMany({
      where: eq(playerAvailability.playerId, selectedPlayer.id),
    }),
  ]);

  const availMap = new Map(existingAvailability.map((a) => [a.slotId, a.status]));
  const serializableSlots = slots.map((slot) => ({
    id: slot.id,
    label: slot.label,
    slotDate: slot.slotDate,
    weekNumber: slot.weekNumber,
    status: availMap.get(slot.id) ?? "unavailable",
  }));

  const fullName = displayName(selectedPlayer.firstName, selectedPlayer.lastName);

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-10 space-y-6">
      <div className="flex items-center justify-between text-sm">
        <Link href="/availability" className="font-semibold text-[--color-clay-600] hover:opacity-90">
          ← Back to players
        </Link>
        <span className="text-[--color-text-muted]">
          {formatDate(activeSeason.startDate)} - {formatDate(activeSeason.endDate)}
        </span>
      </div>

      <div className="rounded-2xl border border-[--color-border] bg-gradient-to-br from-[--color-clay-50] via-white to-[--color-forest-50] px-5 py-5 shadow-sm">
        <h1 className="font-display text-4xl tracking-widest text-[--color-clay-600]">MY AVAILABILITY</h1>
        <p className="mt-1 text-sm text-[--color-text-muted]">{activeSeason.name} - {fullName}</p>
      </div>

      {saved && (
        <div className="rounded-lg border border-[--color-forest-200] bg-[--color-forest-50] px-4 py-3 text-sm font-semibold text-[--color-forest-700]">
          Availability saved successfully.
        </div>
      )}

      {statusMessage && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {statusMessage}
        </div>
      )}

      <AvailabilityWeeklyForm
        playerId={selectedPlayer.id}
        slots={serializableSlots}
        formAction="/api/availability/public"
      />
    </div>
  );
}
