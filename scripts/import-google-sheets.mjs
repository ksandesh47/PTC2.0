import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import postgres from "postgres";
import { config } from "dotenv";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const v1Root = path.resolve(root, "..", "PTC", "tennis-club");
config({ path: path.join(root, ".env.local") });
config({ path: path.join(v1Root, ".env") });

const apply = process.argv.includes("--apply");
const sourceSheets = ["Players", "Matches", "Scores", "Availability", "Seasons", "Settings", "SubRequests", "SubOffers"];
const spreadsheetId = process.env.SHEETS_SPREADSHEET_ID;
const clientEmail = process.env.SHEETS_CLIENT_EMAIL;
const privateKey = (process.env.SHEETS_PRIVATE_KEY || "").replaceAll(String.raw`\n`, "\n");
const databaseUrl = process.env.DATABASE_URL?.replace(/^['\"]|['\"]$/g, "");
const importDatabaseUrl = databaseUrl?.replace(":6543/", ":5432/");
if (!spreadsheetId || !clientEmail || !privateKey) throw new Error("Missing v1 Google Sheets credentials");
if (!databaseUrl) throw new Error("Missing DATABASE_URL");

const report = {
  mode: apply ? "apply" : "dry-run",
  source: "v1 Google Sheets",
  sheets: {},
  imported: {},
  warnings: [],
  errors: [],
};

function clean(value) {
  return String(value ?? "").trim();
}
function normalized(value) {
  return clean(value).toLowerCase().replace(/\s+/g, " ");
}
function isoDate(value) {
  const text = clean(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
}
function splitName(value) {
  const parts = clean(value).split(/\s+/).filter(Boolean);
  return {
    firstName: parts.shift() || "Unknown",
    lastName: parts.join(" ") || "Legacy",
  };
}
function bool(value) {
  return ["true", "1", "yes", "y", "available"].includes(clean(value).toLowerCase());
}
function setNumber(value) {
  const match = /^(\d+)/.exec(clean(value));
  return match ? Number(match[1]) : null;
}
function pairingOverride(value) {
  const match = /\|P([0-2])$/.exec(clean(value));
  return match ? Number(match[1]) : null;
}
function timeLabel(row) {
  const text = clean(row.Time);
  if (text) return text;
  const slot = clean(row.Slot);
  if (/^\d+$/.test(slot)) return "";
  return slot;
}
function parseMatchStart(date, label) {
  const time = /(\d{1,2}):(\d{2})\s*(AM|PM)/i.exec(label);
  if (!time) return `${date}T00:00:00Z`;
  const hour = (Number(time[1]) % 12) + (time[3].toUpperCase() === "PM" ? 12 : 0);
  return `${date}T${String(hour).padStart(2, "0")}:${time[2]}:00Z`;
}
function toActualGames(team1Raw, team2Raw) {
  const team1 = Number(team1Raw);
  const team2 = Number(team2Raw);
  if (!Number.isFinite(team1) || !Number.isFinite(team2)) return { team1: null, team2: null };
  if (team1 > team2 && Number.isInteger((team1 + team2) / 2)) {
    return { team1: (team1 + team2) / 2, team2 };
  }
  if (team2 > team1 && Number.isInteger((team1 + team2) / 2)) {
    return { team1, team2: (team1 + team2) / 2 };
  }
  return { team1, team2 };
}

async function accessToken() {
  const now = Math.floor(Date.now() / 1000);
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const header = encode({ alg: "RS256", typ: "JWT" });
  const payload = encode({ iss: clientEmail, scope: "https://www.googleapis.com/auth/spreadsheets.readonly", aud: "https://oauth2.googleapis.com/token", exp: now + 3600, iat: now });
  const keyData = privateKey
    .replace("-----BEGIN RSA PRIVATE KEY-----", "")
    .replace("-----END RSA PRIVATE KEY-----", "")
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s/g, "");
  const key = crypto.createPrivateKey({ key: Buffer.from(keyData, "base64"), format: "der", type: "pkcs8" });
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(`${header}.${payload}`);
  const assertion = `${header}.${payload}.${signer.sign(key, "base64url")}`;
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${assertion}`,
  });
  const data = await response.json();
  if (!data.access_token) throw new Error("Google access token was not returned");
  return data.access_token;
}

async function loadSheets() {
  const token = await accessToken();
  const ranges = sourceSheets.map((sheet) => `ranges=${encodeURIComponent(sheet)}`).join("&");
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?${ranges}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error(`Google Sheets read failed: ${response.status}`);
  const data = await response.json();
  return Object.fromEntries(sourceSheets.map((sheet, index) => {
    const values = data.valueRanges?.[index]?.values || [];
    const headers = values[0] || [];
    const rows = values.slice(1).map((row) => Object.fromEntries(headers.map((header, column) => [header, row[column] ?? ""])));
    report.sheets[sheet] = rows.length;
    return [sheet, rows];
  }));
}

function buildSourceModel(sheets) {
  const players = sheets.Players.filter((row) => clean(row.Name)).map((row) => ({
    sourceName: clean(row.Name),
    key: normalized(row.Name),
    ...splitName(row.Name),
    isActive: !clean(row.Status) || normalized(row.Status) === "active",
    phone: clean(row.Phone || row.PhoneNumber || row.Mobile || row.Cell) || null,
  }));
  const playerKeys = new Set();
  for (const player of players) {
    if (playerKeys.has(player.key)) report.errors.push(`Duplicate player name: ${player.sourceName}`);
    playerKeys.add(player.key);
  }

  const matchRows = sheets.Matches.filter((row) => clean(row.MatchID));
  const bySeason = new Map();
  for (const row of matchRows) {
    const seasonId = clean(row.SeasonID) || "legacy-season";
    const date = isoDate(row.Date);
    if (!date) report.errors.push(`Invalid match date for ${row.MatchID}`);
    const list = bySeason.get(seasonId) || [];
    list.push({ ...row, seasonId, date, slot: clean(row.Slot), time: timeLabel(row) });
    bySeason.set(seasonId, list);
  }

  const seasons = sheets.Seasons.filter((row) => clean(row.SeasonID) || clean(row.Label)).map((row) => {
    const seasonId = clean(row.SeasonID) || "legacy-season";
    const matches = bySeason.get(seasonId) || [];
    const dates = matches.map((match) => match.date).filter(Boolean).sort();
    return {
      sourceId: seasonId,
      key: normalized(row.Label || seasonId),
      name: clean(row.Label || seasonId),
      startDate: dates[0] || null,
      endDate: dates.at(-1) || null,
      isActive: bool(row.IsActive),
    };
  });
  for (const [seasonId, matches] of bySeason) {
    if (!seasons.some((season) => season.sourceId === seasonId)) {
      const dates = matches.map((match) => match.date).filter(Boolean).sort();
      seasons.push({ sourceId: seasonId, key: normalized(seasonId), name: seasonId, startDate: dates[0], endDate: dates.at(-1), isActive: false });
    }
  }

  return { players, seasons, matches: matchRows.map((row) => ({ ...row, seasonId: clean(row.SeasonID) || "legacy-season", date: isoDate(row.Date), time: timeLabel(row) })), scores: sheets.Scores, availability: sheets.Availability, requests: sheets.SubRequests, offers: sheets.SubOffers };
}

async function importModel(model) {
  const sql = postgres(importDatabaseUrl, { prepare: false, max: 1 });
  try {
    await sql.begin(async (transaction) => {
      const playerMap = new Map((await transaction`SELECT id, lower(trim(first_name || ' ' || last_name)) AS key FROM players`).map((row) => [row.key, row.id]));
      for (const source of model.players) {
        if (playerMap.has(source.key)) continue;
        const inserted = await transaction`INSERT INTO players (first_name, last_name, phone, is_active) VALUES (${source.firstName}, ${source.lastName}, ${source.phone}, ${source.isActive}) RETURNING id`;
        playerMap.set(source.key, inserted[0].id);
      }
      report.imported.players = playerMap.size;

      const seasonMap = new Map();
      const seasonStartMap = new Map();
      const existingSeasons = await transaction`SELECT id, lower(name) AS key, is_active FROM seasons`;
      for (const source of model.seasons) {
        if (!source.startDate || !source.endDate) {
          report.warnings.push(`Skipped season ${source.name}: no usable date range`);
          continue;
        }
        const existing = existingSeasons.find((row) => row.key === source.key)
          || (source.isActive ? existingSeasons.find((row) => row.is_active) : null);
        const id = existing?.id || (await transaction`INSERT INTO seasons (name, start_date, end_date, availability_window_start, availability_window_end, is_active) VALUES (${source.name}, ${source.startDate}, ${source.endDate}, ${source.startDate}, ${source.endDate}, ${source.isActive}) RETURNING id`)[0].id;
        seasonMap.set(source.sourceId, id);
        seasonStartMap.set(source.sourceId, source.startDate);
        await transaction`INSERT INTO season_players (season_id, player_id) SELECT ${id}, id FROM players ON CONFLICT (season_id, player_id) DO NOTHING`;
      }
      report.imported.seasons = seasonMap.size;

      const admin = await transaction`SELECT id FROM users WHERE role = 'admin' LIMIT 1`;
      if (model.scores.length && !admin[0]?.id) throw new Error("At least one admin user is required before importing scores");
      const recorderId = admin[0]?.id;
      const slotMap = new Map();
      for (const row of await transaction`SELECT id, season_id, slot_date::text AS slot_date, label FROM availability_slots`) {
        slotMap.set(`${row.season_id}|${row.slot_date}|${row.label}`, row.id);
        const time = /(\d{1,2}:\d{2}\s*(?:AM|PM))/i.exec(row.label)?.[1]?.toLowerCase();
        if (time) slotMap.set(`${row.season_id}|${row.slot_date}|${time}`, row.id);
      }
      const matchMap = new Map((await transaction`SELECT id, season_id, slot_id FROM matches`).map((row) => [`${row.season_id}|${row.slot_id}`, row.id]));
      const pairingMap = new Map((await transaction`SELECT id, match_id FROM match_pairings`).map((row) => [row.match_id, row.id]));
      const matchTargets = new Map();
      const scoreVersions = new Map((await transaction`SELECT pairing_id, max(version)::int AS version FROM match_sets GROUP BY pairing_id`).map((row) => [row.pairing_id, row.version]));
      const weekNumberFor = (sourceSeasonId, date) => {
        const start = seasonStartMap.get(sourceSeasonId);
        if (!start || !date) return 1;
        return Math.floor((new Date(`${date}T12:00:00Z`) - new Date(`${start}T12:00:00Z`)) / (7 * 24 * 60 * 60 * 1000)) + 1;
      };
      const ensureSlot = async (sourceSeasonId, date, slot, time) => {
        const seasonId = seasonMap.get(sourceSeasonId);
        if (!seasonId || !date) return null;
        const slotKey = `${seasonId}|${date}|${slot}|${time}`;
        let slotId = slotMap.get(slotKey);
        if (!slotId && time) slotId = slotMap.get(`${seasonId}|${date}|${time.toLowerCase()}`);
        if (!slotId) {
          const label = time || `Slot ${slot || "1"}`;
          const insertedSlot = await transaction`INSERT INTO availability_slots (season_id, label, slot_date, week_number) VALUES (${seasonId}, ${label}, ${date}, ${weekNumberFor(sourceSeasonId, date)}) RETURNING id`;
          slotId = insertedSlot[0].id;
          slotMap.set(slotKey, slotId);
        }
        return slotId;
      };
      for (const row of model.matches) {
        const seasonId = seasonMap.get(row.seasonId);
        const playerIds = [row.P1, row.P2, row.P3, row.P4].map((name) => playerMap.get(normalized(name)));
        if (!seasonId || !row.date || playerIds.some((id) => !id)) {
          report.errors.push(`Unresolved match ${row.MatchID} or player assignment`);
          continue;
        }
        const slotId = await ensureSlot(row.seasonId, row.date, row.slot, row.time);
        const matchKey = `${seasonId}|${slotId}`;
        const matchId = matchMap.get(matchKey) || (await transaction`INSERT INTO matches (season_id, slot_id, match_number, week_number, status) VALUES (${seasonId}, ${slotId}, ${Number(row.MatchID) || null}, ${weekNumberFor(row.seasonId, row.date)}, 'scheduled') RETURNING id`)[0].id;
        matchMap.set(matchKey, matchId);
        const pairingId = pairingMap.get(matchId) || (await transaction`INSERT INTO match_pairings (match_id, team1_player1_id, team1_player2_id, team2_player1_id, team2_player2_id) VALUES (${matchId}, ${playerIds[0]}, ${playerIds[1]}, ${playerIds[2]}, ${playerIds[3]}) RETURNING id`)[0].id;
        pairingMap.set(matchId, pairingId);
        await transaction`UPDATE match_pairings SET team1_player1_id = ${playerIds[0]}, team1_player2_id = ${playerIds[1]}, team2_player1_id = ${playerIds[2]}, team2_player2_id = ${playerIds[3]} WHERE id = ${pairingId}`;
        matchTargets.set(clean(row.MatchID), { matchId, pairingId, seasonId });
      }
      report.imported.matches = model.matches.length;

      const scoreGroups = new Map();
      for (const row of model.scores) {
        const target = matchTargets.get(clean(row.MatchID));
        if (target && clean(row.Set) === "ABANDONED") {
          await transaction`UPDATE matches SET status = 'abandoned', abandon_reason = ${clean(row.Team2Score) || clean(row.Team1Score)}, updated_at = now() WHERE id = ${target.matchId}`;
          continue;
        }
        const number = setNumber(row.Set);
        if (!target || !number) {
          if (clean(row.Set) !== "ABANDONED") report.errors.push(`Unresolved score ${row.MatchID}/${row.Set}`);
          continue;
        }
        const group = scoreGroups.get(target.pairingId) || { target, rows: [] };
        group.rows.push({ row, number });
        scoreGroups.set(target.pairingId, group);
      }
      for (const group of scoreGroups.values()) {
        const version = (scoreVersions.get(group.target.pairingId) || 0) + 1;
        for (const { row, number } of group.rows) {
          const actual = toActualGames(row.Team1Score, row.Team2Score);
          if (actual.team1 === null || actual.team2 === null) {
            report.errors.push(`Invalid score ${row.MatchID}/${row.Set}`);
            continue;
          }
          await transaction`INSERT INTO match_sets (match_id, pairing_id, set_number, pairing_override, team1_games, team2_games, team1_points_override, team2_points_override, version, recorded_by) VALUES (${group.target.matchId}, ${group.target.pairingId}, ${number}, ${pairingOverride(row.Set)}, ${actual.team1}, ${actual.team2}, ${Number(row.Team1Score)}, ${Number(row.Team2Score)}, ${version}, ${recorderId})`;
        }
        scoreVersions.set(group.target.pairingId, version);
        await transaction`UPDATE matches SET status = 'completed', updated_at = now() WHERE id = ${group.target.matchId}`;
      }
      report.imported.scores = model.scores.length;

      const availabilityValues = [];
      for (const row of model.availability) {
        const seasonId = seasonMap.get(clean(row.SeasonID));
        const playerId = playerMap.get(normalized(row.Player));
        const date = isoDate(row.Date);
        const slotId = await ensureSlot(clean(row.SeasonID), date, clean(row.Slot), clean(row.Time));
        if (!seasonId || !playerId || !slotId) {
          report.errors.push(`Unresolved availability row for ${row.Player}/${row.Date}/${row.Slot}`);
          continue;
        }
        availabilityValues.push([slotId, playerId, bool(row.Available) ? "available" : "unavailable"]);
      }
      for (let offset = 0; offset < availabilityValues.length; offset += 500) {
        const chunk = availabilityValues.slice(offset, offset + 500);
        const params = chunk.flat();
        const values = chunk.map((_, index) => `($${index * 3 + 1}, $${index * 3 + 2}, $${index * 3 + 3}, now())`).join(",");
        await transaction.unsafe(`INSERT INTO player_availability (slot_id, player_id, status, updated_at) VALUES ${values} ON CONFLICT (slot_id, player_id) DO UPDATE SET status = excluded.status, updated_at = now()`, params);
      }
      report.imported.availability = model.availability.length;

      const requestMap = new Map();
      for (const row of model.requests) {
        const target = matchTargets.get(clean(row.MatchID));
        const requesterId = playerMap.get(normalized(row.RequestedBy));
        if (!target || !requesterId) {
          report.errors.push(`Unresolved substitute request ${row.RequestID}`);
          continue;
        }
        const statusMap = { OPEN: "open", FILLED: "filled", CANCELED: "cancelled", CANCELLED: "cancelled", EXPIRED: "expired" };
        const status = statusMap[clean(row.Status).toUpperCase()] || "expired";
        const filledBy = playerMap.get(normalized(row.FilledBy)) || null;
        const existingRequest = await transaction`SELECT id FROM substitute_requests WHERE match_id = ${target.matchId} AND requested_by = ${requesterId} ORDER BY created_at LIMIT 1`;
        const requestId = existingRequest[0]?.id || (await transaction`INSERT INTO substitute_requests (season_id, match_id, requested_by, reason, status, filled_by, created_at, updated_at) VALUES (${target.seasonId}, ${target.matchId}, ${requesterId}, ${clean(row.Reason) || null}, ${status}, ${filledBy}, ${clean(row.CreatedAt) || new Date().toISOString()}, ${clean(row.UpdatedAt) || new Date().toISOString()}) RETURNING id`)[0].id;
        requestMap.set(clean(row.RequestID), { id: requestId, matchId: target.matchId, requesterId, filledBy });
        if (filledBy) {
          await transaction`UPDATE match_pairings SET team1_player1_id = CASE WHEN team1_player1_id = ${requesterId} THEN ${filledBy} ELSE team1_player1_id END, team1_player2_id = CASE WHEN team1_player2_id = ${requesterId} THEN ${filledBy} ELSE team1_player2_id END, team2_player1_id = CASE WHEN team2_player1_id = ${requesterId} THEN ${filledBy} ELSE team2_player1_id END, team2_player2_id = CASE WHEN team2_player2_id = ${requesterId} THEN ${filledBy} ELSE team2_player2_id END WHERE match_id = ${target.matchId}`;
        }
      }
      report.imported.requests = model.requests.length;
      for (const row of model.offers) {
        const request = requestMap.get(clean(row.RequestID));
        const playerId = playerMap.get(normalized(row.Player));
        if (!request || !playerId) {
          report.errors.push(`Unresolved substitute offer ${row.RequestID}/${row.Player}`);
          continue;
        }
        const statusMap = { PENDING: "pending", SELECTED: "selected", NOT_NEEDED: "not_needed", WITHDRAWN: "withdrawn" };
        const status = statusMap[clean(row.Status).toUpperCase()] || "withdrawn";
        await transaction`INSERT INTO substitute_offers (request_id, player_id, status, offered_at, updated_at) VALUES (${request.id}, ${playerId}, ${status}, ${clean(row.OfferedAt) || new Date().toISOString()}, ${clean(row.UpdatedAt) || new Date().toISOString()}) ON CONFLICT (request_id, player_id) DO UPDATE SET status = excluded.status, updated_at = excluded.updated_at`;
      }
        report.imported.offers = model.offers.length;
      if (report.errors.length > 0) {
        throw new Error(`Import validation failed with ${report.errors.length} error(s)`);
      }
    });
  } finally {
    await sql.end();
  }
}

const sheets = await loadSheets();
const model = buildSourceModel(sheets);
if (!apply) {
  report.imported = { players: model.players.length, seasons: model.seasons.length, matches: model.matches.length, scores: model.scores.length, availability: model.availability.length, requests: model.requests.length, offers: model.offers.length };
} else if (report.errors.length === 0) {
  try {
    await importModel(model);
  } catch (error) {
    report.errors.push(error instanceof Error ? error.message : "Import failed and was rolled back");
  }
} else {
  report.warnings.push("Apply skipped because validation errors were found");
}
const reportDir = path.join(root, "reports");
await fs.mkdir(reportDir, { recursive: true });
const reportPath = path.join(reportDir, `google-sheets-import-${new Date().toISOString().replaceAll(":", "-")}.json`);
await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ mode: report.mode, reportPath, errors: report.errors.length, warnings: report.warnings.length, imported: report.imported }, null, 2));
if (report.errors.length) process.exitCode = 2;
