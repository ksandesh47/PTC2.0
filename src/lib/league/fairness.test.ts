import { describe, expect, it } from "vitest";
import { pickFairCandidates, type FairnessCandidate } from "./fairness";

function candidate(
  playerId: string,
  weeklyGames: number,
  overrides: Partial<FairnessCandidate> = {}
): FairnessCandidate {
  return {
    playerId,
    status: "available",
    name: playerId,
    weeklyGames,
    seasonGames: 0,
    weeklyAvailability: 2,
    ...overrides,
  };
}

describe("pickFairCandidates", () => {
  it("keeps selected players within one weekly game of the minimum when possible", () => {
    const selected = pickFairCandidates([
      candidate("A", 0),
      candidate("B", 1),
      candidate("C", 1),
      candidate("D", 1),
      candidate("E", 2),
    ]);

    expect(selected.map((player) => player.playerId)).toEqual(["A", "B", "C", "D"]);
  });

  it("relaxes the weekly guard when it cannot fill the requested count", () => {
    const selected = pickFairCandidates([
      candidate("A", 0),
      candidate("B", 3),
      candidate("C", 3),
      candidate("D", 3),
      candidate("E", 3),
    ]);

    expect(selected).toHaveLength(4);
    expect(selected.map((player) => player.playerId)).toEqual(["A", "B", "C", "D"]);
  });

  it("prefers available players over maybe players when fairness is otherwise equal", () => {
    const selected = pickFairCandidates([
      candidate("Maybe", 0, { status: "maybe" }),
      candidate("Available", 0),
      candidate("C", 0),
      candidate("D", 0),
      candidate("E", 0),
    ]);

    expect(selected.map((player) => player.playerId)).toEqual([
      "Available",
      "C",
      "D",
      "E",
    ]);
  });

  it("uses deterministic name ordering for otherwise equal candidates", () => {
    const selected = pickFairCandidates([
      candidate("Zulu", 0),
      candidate("Alpha", 0),
      candidate("Bravo", 0),
      candidate("Charlie", 0),
    ]);

    expect(selected.map((player) => player.playerId)).toEqual([
      "Alpha",
      "Bravo",
      "Charlie",
      "Zulu",
    ]);
  });
});