import { config } from "dotenv";
import postgres from "postgres";
config({ path: ".env.local" });

const databaseUrl = process.env.DATABASE_URL?.replace(/^['\"]|['\"]$/g, "");
if (!databaseUrl) throw new Error("DATABASE_URL is required");
const sql = postgres(databaseUrl.replace(":6543/", ":5432/"), { prepare: false, max: 1 });

function addPlayerStats(stats, playerId, score, setsWon, setsLost, gamesWon, gamesLost) {
  const current = stats.get(playerId) || {
    scores: [], matchesPlayed: 0, setsWon: 0, setsLost: 0, gamesWon: 0, gamesLost: 0,
  };
  current.scores.push(score);
  current.matchesPlayed += 1;
  current.setsWon += setsWon;
  current.setsLost += setsLost;
  current.gamesWon += gamesWon;
  current.gamesLost += gamesLost;
  stats.set(playerId, current);
}

const activeSeason = (await sql`SELECT id, name FROM seasons WHERE is_active = true LIMIT 1`)[0];
if (!activeSeason) throw new Error("No active season");
const players = await sql`SELECT p.id, p.first_name, p.last_name
  FROM season_players sp JOIN players p ON p.id = sp.player_id
  WHERE sp.season_id = ${activeSeason.id}`;
const rows = await sql`SELECT m.id AS match_id, m.week_number,
    mp.id AS pairing_id, mp.team1_player1_id, mp.team1_player2_id,
    mp.team2_player1_id, mp.team2_player2_id,
    ms.set_number, ms.pairing_override, ms.team1_games, ms.team2_games,
    ms.team1_points_override, ms.team2_points_override, ms.version
  FROM matches m
  JOIN match_pairings mp ON mp.match_id = m.id
  JOIN match_sets ms ON ms.pairing_id = mp.id
  WHERE m.season_id = ${activeSeason.id} AND m.status = 'completed'
  ORDER BY m.id, mp.id, ms.set_number, ms.version`;

const pairings = new Map();
for (const row of rows) {
  const key = `${row.match_id}|${row.pairing_id}`;
  const group = pairings.get(key) || { ...row, sets: [] };
  group.sets.push(row);
  pairings.set(key, group);
}
const matches = new Map();
for (const pairing of pairings.values()) {
  const match = matches.get(pairing.match_id) || { weekNumber: pairing.week_number, pairings: [] };
  match.pairings.push(pairing);
  matches.set(pairing.match_id, match);
}

const stats = new Map();
for (const match of matches.values()) {
  const matchScore = new Map();
  const matchStats = new Map();
  for (const pairing of match.pairings) {
    const latestVersion = Math.max(...pairing.sets.map((set) => Number(set.version)), 0);
    const sets = pairing.sets.filter((set) => Number(set.version) === latestVersion).sort((a, b) => a.set_number - b.set_number);
    const base = [pairing.team1_player1_id, pairing.team1_player2_id, pairing.team2_player1_id, pairing.team2_player2_id];
    const rotations = [
      [base[0], base[1], base[2], base[3]],
      [base[0], base[2], base[1], base[3]],
      [base[0], base[3], base[1], base[2]],
    ];
    for (const [index, set] of sets.entries()) {
      const team1Games = Number(set.team1_games);
      const team2Games = Number(set.team2_games);
      const rotation = rotations[Number(set.pairing_override ?? index)] || rotations[0];
      const team1 = rotation.slice(0, 2).filter(Boolean);
      const team2 = rotation.slice(2, 4).filter(Boolean);
      const team1Won = team1Games > team2Games;
      const team1Points = set.team1_points_override == null
        ? (team1Won ? team1Games + team1Games - team2Games : team1Games)
        : Number(set.team1_points_override);
      const team2Points = set.team2_points_override == null
        ? (team1Won ? team2Games : team2Games + team2Games - team1Games)
        : Number(set.team2_points_override);
      for (const playerId of team1) {
        matchScore.set(playerId, (matchScore.get(playerId) || 0) + team1Points);
        addPlayerStats(matchStats, playerId, 0, team1Won ? 1 : 0, team1Won ? 0 : 1, team1Games, team2Games);
      }
      for (const playerId of team2) {
        matchScore.set(playerId, (matchScore.get(playerId) || 0) + team2Points);
        addPlayerStats(matchStats, playerId, 0, team1Won ? 0 : 1, team1Won ? 1 : 0, team2Games, team1Games);
      }
    }
  }
  for (const [playerId, playerStats] of matchStats) {
    addPlayerStats(
      stats,
      playerId,
      matchScore.get(playerId) || 0,
      playerStats.setsWon,
      playerStats.setsLost,
      playerStats.gamesWon,
      playerStats.gamesLost
    );
  }
}

const entries = players.map((player) => {
  const value = stats.get(player.id) || { scores: [], matchesPlayed: 0, setsWon: 0, setsLost: 0, gamesWon: 0, gamesLost: 0 };
  const sortedScores = [...value.scores].sort((a, b) => b - a);
  return {
    playerId: player.id,
    matchesPlayed: value.matchesPlayed,
    matchesWon: 0,
    setsWon: value.setsWon,
    setsLost: value.setsLost,
    gamesWon: value.gamesWon,
    gamesLost: value.gamesLost,
    points: sortedScores.slice(0, 8).reduce((sum, score) => sum + score, 0),
    total: sortedScores.reduce((sum, score) => sum + score, 0),
    playerName: `${player.first_name} ${player.last_name}`.trim(),
  };
}).sort((a, b) => b.points - a.points || b.total - a.total || a.playerName.localeCompare(b.playerName));

await sql.begin(async (tx) => {
  await tx`DELETE FROM standings_snapshots WHERE season_id = ${activeSeason.id}`;
  for (const [index, entry] of entries.entries()) {
    await tx`INSERT INTO standings_snapshots (season_id, player_id, matches_played, matches_won, sets_won, sets_lost, games_won, games_lost, points, rank, computed_at)
      VALUES (${activeSeason.id}, ${entry.playerId}, ${entry.matchesPlayed}, ${entry.matchesWon}, ${entry.setsWon}, ${entry.setsLost}, ${entry.gamesWon}, ${entry.gamesLost}, ${entry.points}, ${index + 1}, now())`;
  }
});
console.log(JSON.stringify({ season: activeSeason.name, playersUpdated: entries.length, topFive: entries.slice(0, 5).map(({ playerName, points, rank }, index) => ({ rank: index + 1, playerName, points })) }, null, 2));
await sql.end();
