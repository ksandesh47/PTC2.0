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

// Disable prefetch for serverless environments (Vercel Edge / Supabase Pooler).
const client = postgres(connectionString, { prepare: false });

export const db = drizzle(client, { schema });
