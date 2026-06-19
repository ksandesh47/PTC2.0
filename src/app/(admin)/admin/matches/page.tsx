import Link from "next/link";

export default function AdminMatchesPage() {
  return (
    <div className="p-6 lg:p-8 max-w-4xl space-y-4">
      <h1 className="font-display text-4xl tracking-widest text-[--color-clay-500]">MATCH BUILDER</h1>
      <p className="text-sm text-[--color-text-muted]">
        Match-building tools are being finalized. Use the schedule page to review current slots and assignments.
      </p>
      <Link href="/schedule" className="text-sm font-semibold text-[--color-clay-600] hover:underline">
        Open Schedule →
      </Link>
    </div>
  );
}
