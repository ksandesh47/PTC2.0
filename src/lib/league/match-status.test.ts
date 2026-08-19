import { describe, expect, it } from "vitest";
import { canTransitionMatchStatus } from "./match-status";

describe("canTransitionMatchStatus", () => {
  it("allows normal scheduling progression", () => {
    expect(canTransitionMatchStatus("scheduled", "in_progress")).toBe(true);
    expect(canTransitionMatchStatus("in_progress", "completed")).toBe(true);
  });

  it("allows an explicit reset from a terminal state", () => {
    expect(canTransitionMatchStatus("completed", "scheduled")).toBe(true);
    expect(canTransitionMatchStatus("cancelled", "scheduled")).toBe(true);
  });

  it("rejects direct changes between terminal outcomes", () => {
    expect(canTransitionMatchStatus("abandoned", "completed")).toBe(false);
    expect(canTransitionMatchStatus("completed", "cancelled")).toBe(false);
  });
});