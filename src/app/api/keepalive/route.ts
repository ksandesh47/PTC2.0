import { db } from "@/db";
import { seasons } from "@/db/schema";
import { sql } from "drizzle-orm";

// Called by Vercel Cron every week to prevent the Supabase free-tier project
// from pausing due to inactivity.
// Vercel automatically adds `Authorization: Bearer <CRON_SECRET>` on cron invocations.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Lightweight query — just checks connectivity and returns row count.
    const result = await db.select({ ping: sql<number>`1` }).from(seasons).limit(1);
    const ts = new Date().toISOString();
    console.log(`[keepalive] DB ping OK at ${ts}`);
    return Response.json({ ok: true, ts, rows: result.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[keepalive] DB ping FAILED:", message);
    return Response.json({ ok: false, error: message }, { status: 503 });
  }
}
