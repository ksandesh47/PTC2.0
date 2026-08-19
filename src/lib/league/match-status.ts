export type MatchStatus =
  | "scheduled"
  | "in_progress"
  | "completed"
  | "abandoned"
  | "cancelled";

const allowedTransitions: Record<MatchStatus, MatchStatus[]> = {
  scheduled: ["scheduled", "in_progress", "completed", "abandoned", "cancelled"],
  in_progress: ["in_progress", "completed", "abandoned", "cancelled"],
  completed: ["completed", "scheduled"],
  abandoned: ["abandoned", "scheduled"],
  cancelled: ["cancelled", "scheduled"],
};

export function canTransitionMatchStatus(
  from: MatchStatus,
  to: MatchStatus
) {
  return allowedTransitions[from].includes(to);
}