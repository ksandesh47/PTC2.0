import { describe, expect, it } from "vitest";
import { buildLeagueStandings, type LeagueMatch } from "./scorecards";
import { buildMatchSetRows } from "./display";

function match(id: string, playerId: string, score: number): LeagueMatch {
  return {
    id,
    matchNumber: Number(id),
    weekNumber: 1,
    court: null,
    status: "completed",
    pairings: [
      {
        id: `${id}-pairing`,
        team1Player1Id: playerId,
        team1Player2Id: null,
        team2Player1Id: `${playerId}-opponent`,
        team2Player2Id: null,
        sets: [
          {
            version: 1,
            setNumber: 1,
            team1Games: score,
            team2Games: 0,
          },
        ],
      },
    ],
  };
}

describe("buildLeagueStandings", () => {
  it("counts only the best eight match scores", () => {
    const standings = buildLeagueStandings({
      players: [
        { id: "player", firstName: "Test", lastName: "Player" },
        { id: "player-opponent", firstName: "Other", lastName: "Player" },
      ],
      matches: [
        match("1", "player", 1),
        match("2", "player", 2),
        match("3", "player", 3),
        match("4", "player", 4),
        match("5", "player", 5),
        match("6", "player", 6),
        match("7", "player", 7),
        match("8", "player", 8),
        match("9", "player", 9),
      ],
    });

    const player = standings.find((entry) => entry.playerId === "player");
    expect(player?.matchesPlayed).toBe(9);
    expect(player?.countedMatches).toBe(8);
    expect(player?.standingsTotal).toBe(2 * (2 + 3 + 4 + 5 + 6 + 7 + 8 + 9));
  });

  it("orders equal best-eight totals by all-match points", () => {
    const standings = buildLeagueStandings({
      players: [
        { id: "a", firstName: "A", lastName: "Player" },
        { id: "b", firstName: "B", lastName: "Player" },
      ],
      matches: [match("1", "a", 6), match("2", "b", 6)],
    });

    expect(standings[0]?.playerId).toBe("a");
  });

  it("tracks canceled matches and three-set results separately", () => {
    const completed = match("1", "player", 6);
    completed.pairings[0].sets = [
      { version: 1, setNumber: 1, team1Games: 6, team2Games: 0 },
      { version: 1, setNumber: 2, team1Games: 6, team2Games: 1 },
      { version: 1, setNumber: 3, team1Games: 6, team2Games: 2 },
    ];
    const canceled = {
      ...completed,
      id: "2",
      matchNumber: 2,
      status: "cancelled",
    };

    const standings = buildLeagueStandings({
      players: [
        { id: "player", firstName: "Test", lastName: "Player" },
        { id: "player-opponent", firstName: "Other", lastName: "Player" },
      ],
      matches: [completed],
      canceledMatches: [canceled],
    });

    const player = standings.find((entry) => entry.playerId === "player");
    expect(player?.matchesPlayed).toBe(1);
    expect(player?.matchesCanceled).toBe(1);
    expect(player?.threeSetsWon).toBe(1);
    expect(player?.threeSetsLost).toBe(0);
  });

  it("honors an explicit pairing override when displaying a set", () => {
    const rows = buildMatchSetRows([
      {
        id: "pairing",
        team1Player1Id: "a",
        team1Player2Id: "b",
        team2Player1Id: "c",
        team2Player2Id: "d",
        sets: [
          { version: 1, setNumber: 1, team1Games: 6, team2Games: 0 },
          {
            version: 1,
            setNumber: 2,
            pairingOverride: 0,
            team1Games: 6,
            team2Games: 0,
          },
        ],
      },
    ]);

    expect(rows[1]?.team1Player2Id).toBe("b");
    expect(rows[1]?.team2Player1Id).toBe("c");
  });
});