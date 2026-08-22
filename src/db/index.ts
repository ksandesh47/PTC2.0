import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const rawConnectionString = process.env.DATABASE_URL;

if (!rawConnectionString) {
	throw new Error(
		"Missing DATABASE_URL in environment variables. Add it in Vercel Project Settings > Environment Variables."
	);
}

// Vercel env values can accidentally include surrounding quotes if copied from .env files.
const connectionString = rawConnectionString.replace(/^['\"]|['\"]$/g, "");

// Keep one connection per serverless process so parallel Vercel workers do not
// exhaust the Supabase connection limit.
const client = postgres(connectionString, {
	prepare: false,
	max: 3,
	idle_timeout: 20,
	connect_timeout: 10,
});

export const db = drizzle(client, { schema });
