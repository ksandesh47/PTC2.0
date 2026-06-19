import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

const navLinks = [
  { href: "/schedule", label: "Schedule" },
  { href: "/standings", label: "Standings" },
  { href: "/results", label: "Results" },
  { href: "/stats", label: "Stats" },
];

export async function SiteHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="border-b border-[--color-border] bg-[--color-surface]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-6">
        {/* Logo */}
        <Link
          href="/"
          className="font-display text-2xl tracking-widest text-[--color-accent] leading-none"
        >
          PALOMINO TC
        </Link>

        {/* Primary nav */}
        <nav aria-label="Main navigation" className="hidden sm:flex gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-semibold text-[--color-text-muted] hover:text-[--color-text] transition-colors"
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
                className="text-sm font-semibold text-[--color-text-muted] hover:text-[--color-text] transition-colors"
              >
                My Availability
              </Link>
              <form action="/auth/signout" method="POST">
                <button
                  type="submit"
                  className="text-sm font-semibold text-[--color-clay-600] hover:text-[--color-clay-700] transition-colors"
                >
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/auth/login"
              className="rounded-md bg-[--color-accent] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[--color-accent-hover] transition-colors"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
