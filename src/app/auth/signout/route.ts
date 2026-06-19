import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

async function handleSignOut(req: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/", req.url), { status: 303 });
}

export async function POST(req: NextRequest) {
  return handleSignOut(req);
}

export async function GET(req: NextRequest) {
  return handleSignOut(req);
}
