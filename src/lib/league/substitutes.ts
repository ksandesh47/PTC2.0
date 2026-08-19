export type SubstituteRequestStatus =
  | "open"
  | "filled"
  | "cancelled"
  | "expired";
export type SubstituteOfferStatus =
  | "pending"
  | "selected"
  | "not_needed"
  | "withdrawn";

const requestTransitions: Record<SubstituteRequestStatus, SubstituteRequestStatus[]> = {
  open: ["open", "filled", "cancelled", "expired"],
  filled: ["filled"],
  cancelled: ["cancelled"],
  expired: ["expired"],
};

const offerTransitions: Record<SubstituteOfferStatus, SubstituteOfferStatus[]> = {
  pending: ["pending", "selected", "not_needed", "withdrawn"],
  selected: ["selected"],
  not_needed: ["not_needed"],
  withdrawn: ["withdrawn", "pending"],
};

export function canTransitionSubstituteRequest(
  from: SubstituteRequestStatus,
  to: SubstituteRequestStatus
) {
  return requestTransitions[from].includes(to);
}

export function canTransitionSubstituteOffer(
  from: SubstituteOfferStatus,
  to: SubstituteOfferStatus
) {
  return offerTransitions[from].includes(to);
}

export function isEligibleSubstitute(input: {
  isActive: boolean;
  isAssignedToRequestedMatch: boolean;
  isAssignedToRequestedSlot: boolean;
}) {
  return (
    input.isActive &&
    !input.isAssignedToRequestedMatch &&
    !input.isAssignedToRequestedSlot
  );
}

export function parseSubstituteMatchStart(
  date: string,
  timeLabel: string,
  utcOffset = ""
) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const time = /(\d{1,2}):(\d{2})\s*(AM|PM)/i.exec(timeLabel);
  if (!time) return new Date(`${date}T00:00:00${utcOffset}`);
  const hours = (Number(time[1]) % 12) + (time[3].toUpperCase() === "PM" ? 12 : 0);
  const start = new Date(
    `${date}T${String(hours).padStart(2, "0")}:${time[2]}:00${utcOffset}`
  );
  return Number.isNaN(start.getTime()) ? null : start;
}

export function isSubstituteAutoFillDue(
  date: string,
  timeLabel: string,
  now: Date,
  leadHours: number,
  utcOffset = ""
) {
  const start = parseSubstituteMatchStart(date, timeLabel, utcOffset);
  return !!start && now.getTime() >= start.getTime() - leadHours * 60 * 60 * 1000;
}

export type SubstituteOfferCandidate = {
  playerId: string;
  playerName: string;
  weekGames: number;
  seasonGames: number;
  offeredAt: string;
};

export function pickFairestSubstituteOffer(candidates: SubstituteOfferCandidate[]) {
  return [...candidates].sort(
    (left, right) =>
      left.weekGames - right.weekGames ||
      left.seasonGames - right.seasonGames ||
      left.offeredAt.localeCompare(right.offeredAt) ||
      left.playerName.localeCompare(right.playerName)
  )[0] ?? null;
}