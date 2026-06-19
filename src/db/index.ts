import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// During build, NEXT_PUBLIC_* and server env vars may both be undefined.
// We use a lazy singleton so the client is only created at runtime.
const connectionString = process.env.DATABASE_URL!;

// Disable prefetch for serverless environments (Vercel Edge / Supabase Pooler).
const client = postgres(connectionString, { prepare: false });

export const db = drizzle(client, { schema });
