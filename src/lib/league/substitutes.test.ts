import { describe, expect, it } from "vitest";
import {
  canTransitionSubstituteOffer,
  canTransitionSubstituteRequest,
  isEligibleSubstitute,
  isSubstituteAutoFillDue,
  pickFairestSubstituteOffer,
} from "./substitutes";

describe("substitute lifecycle", () => {
  it("allows an open request to resolve once", () => {
    expect(canTransitionSubstituteRequest("open", "filled")).toBe(true);
    expect(canTransitionSubstituteRequest("open", "cancelled")).toBe(true);
    expect(canTransitionSubstituteRequest("filled", "open")).toBe(false);
  });

  it("allows pending offers to resolve and withdrawn offers to be reactivated", () => {
    expect(canTransitionSubstituteOffer("pending", "selected")).toBe(true);
    expect(canTransitionSubstituteOffer("pending", "not_needed")).toBe(true);
    expect(canTransitionSubstituteOffer("withdrawn", "pending")).toBe(true);
    expect(canTransitionSubstituteOffer("selected", "pending")).toBe(false);
  });

  it("rejects inactive or conflicting substitute players", () => {
    expect(
      isEligibleSubstitute({
        isActive: true,
        isAssignedToRequestedMatch: false,
        isAssignedToRequestedSlot: false,
      })
    ).toBe(true);
    expect(
      isEligibleSubstitute({
        isActive: true,
        isAssignedToRequestedMatch: false,
        isAssignedToRequestedSlot: true,
      })
    ).toBe(false);
  });

  it("detects the v1 lead-time auto-fill window", () => {
    expect(
      isSubstituteAutoFillDue(
        "2026-08-19",
        "Wed - 5:30 PM",
        new Date("2026-08-18T12:00:00-07:00"),
        30,
        "-07:00"
      )
    ).toBe(true);
  });

  it("selects the fairest offer deterministically", () => {
    expect(
      pickFairestSubstituteOffer([
        { playerId: "a", playerName: "Alpha", weekGames: 1, seasonGames: 3, offeredAt: "2026-08-18T10:00:00Z" },
        { playerId: "b", playerName: "Beta", weekGames: 0, seasonGames: 8, offeredAt: "2026-08-18T11:00:00Z" },
        { playerId: "c", playerName: "Charlie", weekGames: 1, seasonGames: 3, offeredAt: "2026-08-18T09:00:00Z" },
      ])?.playerId
    ).toBe("b");
  });
});