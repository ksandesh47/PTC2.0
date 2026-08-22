import Link from "next/link";

export default function HomePage() {
  return (
    <>
      {/* Hero banner */}
      <section className="bg-(--color-clay-800) py-12 text-center space-y-4 sm:py-16">
        <div className="mx-auto w-full max-w-7xl px-4 md:w-3/5">
          <h1 className="break-words px-4 font-display text-4xl text-(--color-clay-100) tracking-widest sm:text-6xl lg:text-8xl">
            PALOMINO TENNIS CLUB
          </h1>
          <p className="text-lg text-(--color-clay-300) max-w-xl mx-auto">
            Weekly rotating doubles, best-eight standings, live results, and availability built around Palomino&apos;s actual league logic.
          </p>
        </div>
      </section>

      <div className="mx-auto w-full max-w-7xl px-4 py-12 space-y-12 md:w-3/5">
        {/* Quick-links grid */}
        <section>
          <h2 className="font-display text-3xl tracking-widest mb-6">QUICK ACCESS</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-stagger">
            {[
              { href: "/standings", title: "Live Standings", desc: "Current rankings for the active season.", icon: "🏆" },
              { href: "/schedule", title: "Season Schedule", desc: "Week-by-week match schedule and courts.", icon: "📅" },
              { href: "/results", title: "Match Results", desc: "Full archive of completed matches.", icon: "📋" },
              { href: "/stats", title: "League Stats", desc: "Best-eight totals, averages, sets, and games.", icon: "📊" },
              { href: "/player/availability", title: "My Availability", desc: "Declare when you can play.", auth: true, icon: "🎾" },
              { href: "/admin", title: "Admin Dashboard", desc: "Score entry, assignments, audit log.", admin: true, icon: "⚙️" },
            ].map((card) => (
              <Link
                key={card.href}
                href={card.href}
                className="group block rounded-lg border-l-4 border-l-(--color-clay-400) border border-(--color-border) bg-(--color-surface) p-5 hover:border-l-(--color-clay-600) hover:shadow-md transition-all"
              >
                <h3 className="font-display text-xl tracking-wider text-(--color-text) group-hover:text-(--color-accent) transition-colors">
                  <span className="mr-2">{card.icon}</span>
                  {card.title}
                  {card.auth && (
                    <span className="ml-2 text-xs font-body font-normal text-(--color-text-muted)">
                      (sign in required)
                    </span>
                  )}
                  {card.admin && (
                    <span className="ml-2 text-xs font-body font-normal text-(--color-clay-500)">
                      (admin)
                    </span>
                  )}
                </h3>
                <p className="mt-1 text-sm text-(--color-text-muted)">{card.desc}</p>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
