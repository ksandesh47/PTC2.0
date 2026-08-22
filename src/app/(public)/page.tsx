import Link from "next/link";

export default function HomePage() {
  return (
    <>
      <section className="border-b border-(--color-ink-4) bg-(--color-ink) px-4 py-20 text-center text-white sm:py-28">
        <div className="mx-auto max-w-3xl">
          <p className="mb-5 text-xs font-semibold uppercase tracking-[0.3em] text-(--color-brand)">Palomino Tennis Club · Summer 2026</p>
          <h1 className="text-5xl tracking-widest sm:text-7xl lg:text-8xl">PLAY THE WEEK</h1>
          <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-(--color-navy-200) sm:text-lg">
            Every match, score, and opening on the court in one quiet place.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/schedule" className="rounded-full bg-(--color-brand) px-5 py-2.5 text-sm font-semibold text-(--color-ink) transition-transform hover:-translate-y-0.5 hover:bg-(--color-brand-active)">
              View schedule
            </Link>
            <Link href="/standings" className="rounded-full border border-(--color-navy-400) px-5 py-2.5 text-sm font-semibold text-white hover:border-white">
              See standings
            </Link>
          </div>
        </div>
      </section>

      <div className="mx-auto w-full max-w-7xl px-4 py-14 md:w-3/5">
        <section className="space-y-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-(--color-accent)">Everything in season</p>
            <h2 className="mt-2 text-3xl tracking-widest">QUICK ACCESS</h2>
          </div>
          <div className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-(--color-border) bg-(--color-border) sm:grid-cols-2">
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
                className="group block bg-(--color-surface) p-5 transition-colors hover:bg-(--color-clay-50)"
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
