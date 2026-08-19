import crypto from "node:crypto";
import postgres from "postgres";
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const v1Root = path.resolve(root, "..", "PTC", "tennis-club");
config({ path: path.join(root, ".env.local") });
config({ path: path.join(v1Root, ".env") });

const apply = process.argv.includes("--apply");
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const databaseUrl = process.env.DATABASE_URL?.replace(/^['\"]|['\"]$/g, "");
const spreadsheetId = process.env.SHEETS_SPREADSHEET_ID;
const clientEmail = process.env.SHEETS_CLIENT_EMAIL;
const privateKey = (process.env.SHEETS_PRIVATE_KEY || "").replaceAll(String.raw`\n`, "\n");
if (!supabaseUrl || !databaseUrl || !spreadsheetId || !clientEmail || !privateKey) {
  throw new Error("Missing Supabase, database, or v1 Google Sheets configuration");
}

const clean = (value) => String(value ?? "").trim();
const normalize = (value) => clean(value).toLowerCase().replace(/\s+/g, " ");
const phoneDigits = (value) => clean(value).replace(/\D/g, "");
const lastFour = (value) => phoneDigits(value).slice(-4);
const emailFrom = (row) => clean(row.Email || row.email || row["Email Address"] || row["EmailAddress"] || row["E-mail"]);
const phoneFrom = (row) => clean(row.Phone || row.PhoneNumber || row["Phone Number"] || row.Mobile || row.Cell || row.Contact || row["Phone#"]);
const nameParts = (name) => {
  const parts = clean(name).split(/\s+/).filter(Boolean);
  return { firstName: parts.shift() || "", lastName: parts.join(" ") || "" };
};

async function googleToken() {
  const now = Math.floor(Date.now() / 1000);
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const input = `${encode({ alg: "RS256", typ: "JWT" })}.${encode({ iss: clientEmail, scope: "https://www.googleapis.com/auth/spreadsheets.readonly", aud: "https://oauth2.googleapis.com/token", exp: now + 3600, iat: now })}`;
  const keyData = privateKey.replace(/-----[^-]+-----/g, "").replace(/\s/g, "");
  const key = crypto.createPrivateKey({ key: Buffer.from(keyData, "base64"), format: "der", type: "pkcs8" });
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(input);
  const response = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${input}.${signer.sign(key, "base64url")}` });
  const data = await response.json();
  if (!data.access_token) throw new Error("Could not authenticate to Google Sheets");
  return data.access_token;
}

async function loadPlayers() {
  const token = await googleToken();
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Players`, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error(`Google Sheets read failed: ${response.status}`);
  const values = (await response.json()).values || [];
  const headers = values[0] || [];
  return values.slice(1).map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ""]))).filter((row) => clean(row.Name));
}

const sheetPlayers = await loadPlayers();
const rows = sheetPlayers.map((row) => {
  const { firstName, lastName } = nameParts(row.Name);
  const email = emailFrom(row).toLowerCase();
  const lastFourDigits = lastFour(phoneFrom(row));
  return { sourceName: clean(row.Name), key: normalize(row.Name), firstName, lastName, email, lastFourDigits, password: lastFourDigits ? `${lastFourDigits}@73PTC` : "" };
});
const invalid = rows.filter((row) => !row.email || row.lastFourDigits.length !== 4);
if (invalid.length) {
  console.error(`${invalid.length} player(s) are missing a valid email or four phone digits:`);
  for (const row of invalid) console.error(`- ${row.sourceName}`);
  process.exitCode = 2;
}

console.log(JSON.stringify({ mode: apply ? "apply" : "dry-run", totalPlayers: rows.length, ready: rows.length - invalid.length, missingCredentials: invalid.length, note: "Passwords are never printed." }, null, 2));
if (!apply || invalid.length) process.exit(invalid.length ? 2 : 0);
if (!serviceRoleKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for --apply and must never be exposed to the browser");

const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
const sql = postgres(databaseUrl.replace(":6543/", ":5432/"), { prepare: false, max: 1 });
try {
  const dbPlayers = await sql`SELECT id, lower(trim(first_name || ' ' || last_name)) AS key, user_id FROM players`;
  const dbByKey = new Map(dbPlayers.map((player) => [player.key, player]));
  const { data: existingUsers, error: listError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listError) throw listError;
  let linked = 0;
  for (const row of rows) {
    const player = dbByKey.get(row.key);
    if (!player) throw new Error(`No Supabase player record matches ${row.sourceName}`);
    const existing = existingUsers.users.find((user) => user.email?.toLowerCase() === row.email);
    let user = existing;
    if (!user) {
      const result = await admin.auth.admin.createUser({ email: row.email, password: row.password, email_confirm: true, user_metadata: { first_name: row.firstName, last_name: row.lastName } });
      if (result.error) throw result.error;
      user = result.data.user;
    } else {
      const result = await admin.auth.admin.updateUserById(existing.id, { password: row.password, email_confirm: true, user_metadata: { first_name: row.firstName, last_name: row.lastName } });
      if (result.error) throw result.error;
    }
    await sql`INSERT INTO users (id, email, role) VALUES (${user.id}, ${row.email}, 'player') ON CONFLICT (id) DO UPDATE SET email = excluded.email`;
    await sql`UPDATE players SET user_id = ${user.id}, updated_at = now() WHERE id = ${player.id}`;
    linked += 1;
  }
  console.log(JSON.stringify({ mode: "apply", linked }, null, 2));
} finally {
  await sql.end();
}
