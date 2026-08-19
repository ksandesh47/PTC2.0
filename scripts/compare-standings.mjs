import crypto from "node:crypto";
import postgres from "postgres";
import { config } from "dotenv";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const v1Root = path.resolve(root, "..", "PTC", "tennis-club");
config({ path: path.join(root, ".env.local") });
config({ path: path.join(v1Root, ".env") });
const sheetsId = process.env.SHEETS_SPREADSHEET_ID;
const clientEmail = process.env.SHEETS_CLIENT_EMAIL;
const privateKey = (process.env.SHEETS_PRIVATE_KEY || "").replaceAll(String.raw`\n`, "\n");
const databaseUrl = process.env.DATABASE_URL?.replace(/^['\"]|['\"]$/g, "");

const clean = (value) => String(value ?? "").trim();
const number = (value) => Number.parseInt(value, 10);
const normalize = (value) => clean(value).toLowerCase();

async function token() {
  const now = Math.floor(Date.now() / 1000);
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const input = `${encode({ alg: "RS256", typ: "JWT" })}.${encode({ iss: clientEmail, scope: "https://www.googleapis.com/auth/spreadsheets.readonly", aud: "https://oauth2.googleapis.com/token", exp: now + 3600, iat: now })}`;
  const keyData = privateKey.replace(/-----[^-]+-----/g, "").replace(/\s/g, "");
  const key = crypto.createPrivateKey({ key: Buffer.from(keyData, "base64"), format: "der", type: "pkcs8" });
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(input);
  const response = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${input}.${signer.sign(key, "base64url")}` });
  return (await response.json()).access_token;
}
async function sheet(accessToken, name) {
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetsId}/values/${encodeURIComponent(name)}`, { headers: { Authorization: `Bearer ${accessToken}` } });
  const values = (await response.json()).values || [];
  const headers = values[0] || [];
  return values.slice(1).map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ""])));
}

const accessToken = await token();
const [players, matches, scores, seasons] = await Promise.all([sheet(accessToken, "Players"), sheet(accessToken, "Matches"), sheet(accessToken, "Scores"), sheet(accessToken, "Seasons")]);
const activeSeasonId = seasons.find((season) => ["true", "1", "yes"].includes(normalize(season.IsActive)))?.SeasonID;
const activeMatches = matches.filter((match) => clean(match.SeasonID) === clean(activeSeasonId));
const activeMatchIds = new Set(activeMatches.map((match) => clean(match.MatchID)));
const activeScores = scores.filter((score) => activeMatchIds.has(clean(score.MatchID)));
const stats = new Map(players.filter((player) => clean(player.Name)).map((player) => [clean(player.Name), { name: clean(player.Name), scores: [], sets: 0 }]));
const scoresByMatch = new Map();
for (const score of activeScores) {
  const list = scoresByMatch.get(clean(score.MatchID)) || [];
  list.push(score);
  scoresByMatch.set(clean(score.MatchID), list);
}
for (const match of activeMatches) {
  const matchScores = scoresByMatch.get(clean(match.MatchID)) || [];
  const names = [clean(match.P1), clean(match.P2), clean(match.P3), clean(match.P4)];
  if (!matchScores.length || names.some((name) => !stats.has(name))) continue;
  const matchScore = new Map(names.map((name) => [name, 0]));
  for (const score of matchScores) {
    const set = /^(\d+)/.exec(clean(score.Set));
    if (!set) continue;
    const setNumber = Number(set[1]);
    const override = /\|P([0-2])$/.exec(clean(score.Set));
    const pairingIndex = override ? Number(override[1]) : setNumber - 1;
    const rotations = [[names[0], names[1], names[2], names[3]], [names[0], names[2], names[1], names[3]], [names[0], names[3], names[1], names[2]]];
    const pairing = rotations[pairingIndex];
    if (!pairing) continue;
    const team1 = number(score.Team1Score);
    const team2 = number(score.Team2Score);
    if (!Number.isFinite(team1) || !Number.isFinite(team2)) continue;
    for (const name of pairing.slice(0, 2)) {
      stats.get(name).sets += team1;
      matchScore.set(name, matchScore.get(name) + team1);
    }
    for (const name of pairing.slice(2)) {
      stats.get(name).sets += team2;
      matchScore.set(name, matchScore.get(name) + team2);
    }
  }
  for (const [name, score] of matchScore) stats.get(name).scores.push(score);
}
const v1 = [...stats.values()].map((entry) => ({ name: entry.name, points: [...entry.scores].sort((a, b) => b - a).slice(0, 8).reduce((sum, value) => sum + value, 0), sets: entry.sets })).sort((a, b) => b.points - a.points || b.sets - a.sets || a.name.localeCompare(b.name));
const sql = postgres(databaseUrl.replace(":6543/", ":5432/"), { prepare: false, max: 1 });
const v2Rows = await sql`SELECT p.first_name, p.last_name, ss.points, ss.sets_won AS sets FROM standings_snapshots ss JOIN players p ON p.id = ss.player_id JOIN seasons s ON s.id = ss.season_id WHERE s.is_active = true ORDER BY ss.rank`;
const v2 = v2Rows.map((row) => ({ name: `${row.first_name} ${row.last_name}`.trim(), legacyName: row.last_name === "Legacy" ? row.first_name : null, points: Number(row.points), sets: Number(row.sets) }));
const v2ByName = new Map(v2.flatMap((row) => [[normalize(row.name), row], ...(row.legacyName ? [[normalize(row.legacyName), row]] : [])]));
const differences = v1.filter((row) => {
  const match = v2ByName.get(normalize(row.name));
  return !match || match.points !== row.points;
}).map((row) => ({ v1: row, v2: v2ByName.get(normalize(row.name)) || null }));
const riJeffRows = activeMatches
  .filter((match) => [match.P1, match.P2, match.P3, match.P4].some((name) => normalize(name) === normalize("RI Jeff")))
  .map((match) => ({ matchId: match.MatchID, date: match.Date, players: [match.P1, match.P2, match.P3, match.P4], scores: scoresByMatch.get(clean(match.MatchID)) || [] }));
const result = {
  match: differences.length === 0,
  differences,
  metricNote: "v1 'sets' is total set points; v2 'sets' is sets won. Compare points for standings parity.",
  riJeffRows,
  v1TopFive: v1.slice(0, 5),
  v2TopFive: v2.slice(0, 5),
};
const reportPath = path.join(root, "reports", `standings-comparison-${new Date().toISOString().replaceAll(":", "-")}.json`);
await fs.writeFile(reportPath, JSON.stringify(result, null, 2));
console.log(JSON.stringify({ ...result, reportPath }, null, 2));
await sql.end();
if (!result.match) process.exitCode = 2;
