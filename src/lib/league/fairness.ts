export type FairnessCandidate = {
  playerId: string;
  status: string;
  name: string;
  weeklyGames: number;
  seasonGames: number;
  weeklyAvailability: number;
};

function statusRank(status: string) {
  return status === "available" ? 0 : 1;
}

export function pickFairCandidates(
  candidates: FairnessCandidate[],
  count = 4
) {
  const selected: FairnessCandidate[] = [];
  const remaining = [...candidates];
  const dynamicWeeklyGames = new Map(
    candidates.map((candidate) => [candidate.playerId, candidate.weeklyGames])
  );

  while (selected.length < count && remaining.length > 0) {
    const minimumWeeklyGames = Math.min(
      ...remaining.map(
        (candidate) => dynamicWeeklyGames.get(candidate.playerId) ?? 0
      )
    );
    const strictPool = remaining.filter(
      (candidate) =>
        (dynamicWeeklyGames.get(candidate.playerId) ?? 0) <=
        minimumWeeklyGames + 1
    );
    const pool = (strictPool.length >= count - selected.length
      ? strictPool
      : remaining
    ).sort((left, right) => {
      const leftWeeklyGames = dynamicWeeklyGames.get(left.playerId) ?? 0;
      const rightWeeklyGames = dynamicWeeklyGames.get(right.playerId) ?? 0;

      return (
        statusRank(left.status) - statusRank(right.status) ||
        leftWeeklyGames - rightWeeklyGames ||
        left.seasonGames - right.seasonGames ||
        Number(left.weeklyGames === 0) - Number(right.weeklyGames === 0) ||
        left.weeklyAvailability - right.weeklyAvailability ||
        leftWeeklyGames / (left.weeklyAvailability || Number.POSITIVE_INFINITY) -
          rightWeeklyGames / (right.weeklyAvailability || Number.POSITIVE_INFINITY) ||
        left.name.localeCompare(right.name)
      );
    });

    const next = pool[0];
    if (!next) break;
    selected.push(next);
    dynamicWeeklyGames.set(
      next.playerId,
      (dynamicWeeklyGames.get(next.playerId) ?? 0) + 1
    );
    remaining.splice(remaining.indexOf(next), 1);
  }

  return selected;
}