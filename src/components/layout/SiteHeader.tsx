import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "./SignOutButton";

const navLinks = [
  { href: "/schedule", label: "Schedule" },
  { href: "/standings", label: "Standings" },
  { href: "/results", label: "Results" },
  { href: "/stats", label: "Stats" },
];

export async function SiteHeader() {
  let user: { id: string } | null = null;

  try {
    const supabase = await createClient();
    const {
      data: { user: resolvedUser },
    } = await supabase.auth.getUser();
    user = resolvedUser;
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      (error as { digest?: string }).digest === "DYNAMIC_SERVER_USAGE"
    ) {
      throw error;
    }
    console.error("Failed to resolve header session", error);
  }

  return (
    <header className="bg-(--color-clay-900) shadow-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-6">
        {/* Logo */}
        <Link
          href="/"
          className="font-display text-2xl tracking-widest text-(--color-clay-200) hover:text-white leading-none transition-colors flex items-center gap-2"
        >
          <span>🎾</span> PTC
        </Link>

        {/* Primary nav */}
        <nav aria-label="Main navigation" className="hidden sm:flex gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-semibold text-(--color-clay-300) hover:text-white transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Auth actions */}
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Link
                href="/player/availability"
                className="text-sm font-semibold text-(--color-clay-300) hover:text-white transition-colors"
              >
                My Availability
              </Link>
              <SignOutButton />
            </>
          ) : (
            <Link
              href="/auth/login"
              className="rounded-md bg-(--color-clay-600) px-3 py-1.5 text-sm font-semibold text-white hover:bg-(--color-clay-500) transition-colors"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
