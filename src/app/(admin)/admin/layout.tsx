// import { createClient } from "@/lib/supabase/server";
// import { redirect } from "next/navigation";
// import { db } from "@/db";
// import { users } from "@/db/schema";
// import { eq } from "drizzle-orm";
import { ReactNode } from "react";
import Link from "next/link";

const adminNav = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/matches", label: "Match Builder" },
  { href: "/admin/scores", label: "Score Entry" },
  { href: "/admin/players", label: "Players" },
  { href: "/admin/availability", label: "Availability" },
  { href: "/admin/substitutes", label: "Substitutes" },
  { href: "/admin/seasons", label: "Seasons" },
  { href: "/admin/audit", label: "Audit Log" },
];

export default async function AdminLayout({ children }: Readonly<{ children: ReactNode }>) {
  // Auth disabled for now - allow access without sign-in
  // if (process.env.NODE_ENV === "production") {
  //   const supabase = await createClient();
  //   const { data: { user } } = await supabase.auth.getUser();
  //   if (!user) redirect("/auth/login?next=/admin");
  //
  //   const profile = await db.query.users.findFirst({
  //     where: eq(users.id, user.id),
  //   });
  //
  //   if (profile?.role !== "admin" && profile?.role !== "captain") {
  //     redirect("/");
  //   }
  // }

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)]">
      {/* Sticky action rail */}
      <aside className="hidden lg:flex flex-col w-56 border-r border-(--color-navy-800) bg-(--color-navy-900) py-6 px-4 gap-1 sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto">
        <p className="text-xs font-bold uppercase tracking-widest text-(--color-navy-400) mb-3 px-2">
          Admin
        </p>
        {adminNav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-md px-3 py-2 text-sm font-semibold text-(--color-navy-300) hover:bg-(--color-navy-800) hover:text-white transition-colors"
          >
            {item.label}
          </Link>
        ))}
      </aside>

      {/* Command area */}
      <div className="flex-1 overflow-y-auto bg-(--color-navy-50)">
        <nav aria-label="Mobile admin navigation" className="lg:hidden sticky top-14 z-20 overflow-x-auto border-b border-(--color-navy-800) bg-(--color-navy-900) px-3 py-2">
          <div className="flex min-w-max gap-1">
            {adminNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-3 py-2 text-xs font-semibold whitespace-nowrap text-(--color-navy-200) hover:bg-(--color-navy-800) hover:text-white"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
        {children}
      </div>
    </div>
  );
}
