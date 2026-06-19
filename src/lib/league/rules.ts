export type LeagueRules = {
  clubName: string;
  availabilityWindowDays: number;
  matchFormat: {
    playersPerMatch: number;
    setsPerMatch: number;
    pairingStyle: "rotating_doubles" | "fixed_doubles";
  };
  standings: {
    model: "best_n_match_scores" | "cumulative_points";
    topMatchCount: number;
    fallbackLabel: string;
    tieBreakers: string[];
  };
};

export const palominoLeagueRules: LeagueRules = {
  clubName: "Palomino Tennis Club",
  availabilityWindowDays: 60,
  matchFormat: {
    playersPerMatch: 4,
    setsPerMatch: 3,
    pairingStyle: "rotating_doubles",
  },
  standings: {
    model: "best_n_match_scores",
    topMatchCount: 8,
    fallbackLabel: "Current snapshot points",
    tieBreakers: ["sets won", "games won", "head-to-head"],
  },
};

export function getStandingsLabel(rules = palominoLeagueRules) {
  return `Best ${rules.standings.topMatchCount}`;
}

export function getMatchFormatLabel(rules = palominoLeagueRules) {
  return `${rules.matchFormat.setsPerMatch} rotating doubles sets`;
}