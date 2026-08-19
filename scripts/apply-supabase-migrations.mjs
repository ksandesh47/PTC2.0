import fs from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";
import { config } from "dotenv";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
config({ path: path.join(root, ".env.local") });
const migrationNames = [
  "20260818_add_availability_window.sql",
  "20260818_add_pairing_override.sql",
  "20260818_add_legacy_points_override.sql",
  "20260818_backfill_completed_match_numbers.sql",
  "20260818_dedupe_availability_slots.sql",
  "20260818_remove_empty_duplicate_matches.sql",
  "20260818_harden_rls.sql",
  "20260818_add_substitutes.sql",
];

const connectionString = process.env.DATABASE_URL?.replace(/^['\"]|['\"]$/g, "");
if (!connectionString) throw new Error("DATABASE_URL is required");

const client = postgres(connectionString, { prepare: false, max: 1 });
try {
  for (const name of migrationNames) {
    const sql = await fs.readFile(path.join(root, "supabase", "migrations", name), "utf8");
    console.log(`Applying ${name}`);
    await client.unsafe(sql);
  }
  console.log("Supabase migrations applied");
} finally {
  await client.end();
}
