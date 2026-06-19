import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ReactNode } from "react";
import Link from "next/link";

const adminNav = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/matches", label: "Match Builder" },
  { href: "/admin/scores", label: "Score Entry" },
  { href: "/admin/players", label: "Players" },
  { href: "/admin/availability", label: "Availability" },
  { href: "/admin/seasons", label: "Seasons" },
  { href: "/admin/audit", label: "Audit Log" },
];

export default async function AdminLayout({ children }: Readonly<{ children: ReactNode }>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/admin");

  const profile = await db.query.users.findFirst({
    where: eq(users.id, user.id),
  });

  if (profile?.role !== "admin") {
    redirect("/");
  }

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)]">
      {/* Sticky action rail */}
      <aside className="hidden lg:flex flex-col w-56 border-r border-[--color-border] bg-[--color-surface] py-6 px-4 gap-1 sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto">
        <p className="text-xs font-bold uppercase tracking-widest text-[--color-text-muted] mb-3 px-2">
          Admin
        </p>
        {adminNav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-md px-3 py-2 text-sm font-semibold text-[--color-text-muted] hover:bg-[--color-clay-50] hover:text-[--color-text] transition-colors"
          >
            {item.label}
          </Link>
        ))}
      </aside>

      {/* Command area */}
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
