import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabasePublicConfig } from "./config";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const pathname = request.nextUrl.pathname;
  const isPlayerRoute = pathname.startsWith("/player");
  const isAdminRoute = pathname.startsWith("/admin");
  const isAuthRoute = pathname.startsWith("/auth");

  let url: string;
  let key: string;
  try {
    const config = getSupabasePublicConfig();
    url = config.url;
    key = config.key;
  } catch (error) {
    console.error("Supabase middleware config unavailable", error);

    if (isPlayerRoute || isAdminRoute) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/auth/login";
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }

    return supabaseResponse;
  }

  const supabase = createServerClient(
    url,
    key,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session — MUST call getUser() before any protected logic.
  let user: { id: string } | null = null;
  try {
    const {
      data: { user: resolvedUser },
    } = await supabase.auth.getUser();
    user = resolvedUser;
  } catch (error) {
    console.error("Supabase middleware session refresh failed", error);
  }

  if (!user && isPlayerRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // TODO: Re-enable authentication for admin routes in production
  // if (!user && isAdminRoute) {
  //   const url = request.nextUrl.clone();
  //   url.pathname = "/auth/login";
  //   url.searchParams.set("next", pathname);
  //   return NextResponse.redirect(url);
  // }

  // Redirect already-logged-in users away from auth pages.
  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
