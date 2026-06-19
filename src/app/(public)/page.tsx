import Link from "next/link";

export default function HomePage() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 space-y-16">
      {/* Hero */}
      <section className="text-center space-y-4">
        <div className="flex justify-center gap-3">
          <Link
            href="/availability"
            className="rounded-md border border-[--color-border] bg-[--color-surface] px-4 py-2 text-sm font-semibold text-[--color-text] hover:bg-[--color-clay-50]"
          >
            📋 Report Availability
          </Link>
          <Link
            href="/admin"
            className="rounded-md border border-[--color-border] bg-[--color-surface] px-4 py-2 text-sm font-semibold text-[--color-text] hover:bg-[--color-clay-50]"
          >
            ⚙ Admin
          </Link>
        </div>

        <h1 className="font-display text-6xl sm:text-8xl text-[--color-clay-500] tracking-widest">
          PALOMINO TENNIS CLUB
        </h1>
        <p className="text-lg text-[--color-text-muted] max-w-xl mx-auto">
          Weekly rotating doubles, best-eight standings, live results, and availability built around Palomino's actual league logic.
        </p>
        <div className="flex justify-center gap-4 pt-2">
          <Link
            href="/standings"
            className="rounded-md bg-[--color-accent] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[--color-accent-hover] transition-colors"
          >
            View Standings
          </Link>
          <Link
            href="/schedule"
            className="rounded-md border border-[--color-border] px-5 py-2.5 text-sm font-semibold text-[--color-text] hover:bg-[--color-clay-50] transition-colors"
          >
            This Week's Schedule
          </Link>
        </div>

        <div className="mx-auto flex w-full max-w-3xl flex-wrap justify-center gap-2 pt-2">
          {[
            { href: "/schedule", label: "📅 Schedule" },
            { href: "/standings", label: "🏆 Standings" },
            { href: "/results", label: "📋 Results" },
            { href: "/stats", label: "📊 Stats" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full border border-[--color-border] bg-[--color-surface] px-4 py-1.5 text-sm font-semibold text-[--color-text-muted] hover:border-[--color-clay-300] hover:text-[--color-text]"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </section>

      {/* Quick-links grid */}
      <section>
        <h2 className="font-display text-3xl tracking-widest mb-6">QUICK ACCESS</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-stagger">
          {[
            { href: "/standings", title: "Live Standings", desc: "Current rankings for the active season." },
            { href: "/schedule", title: "Season Schedule", desc: "Week-by-week match schedule and courts." },
            { href: "/results", title: "Match Results", desc: "Full archive of completed matches." },
            { href: "/stats", title: "League Stats", desc: "Best-eight totals, averages, sets, and games." },
            { href: "/player/availability", title: "My Availability", desc: "Declare when you can play.", auth: true },
            { href: "/admin", title: "Admin Dashboard", desc: "Score entry, assignments, audit log.", admin: true },
          ].map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="group block rounded-lg border border-[--color-border] bg-[--color-surface] p-5 hover:border-[--color-clay-300] hover:shadow-sm transition-all"
            >
              <h3 className="font-display text-xl tracking-wider text-[--color-text] group-hover:text-[--color-accent] transition-colors">
                {card.title}
                {card.auth && (
                  <span className="ml-2 text-xs font-body font-normal text-[--color-text-muted]">
                    (sign in required)
                  </span>
                )}
                {card.admin && (
                  <span className="ml-2 text-xs font-body font-normal text-[--color-clay-500]">
                    (admin)
                  </span>
                )}
              </h3>
              <p className="mt-1 text-sm text-[--color-text-muted]">{card.desc}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
