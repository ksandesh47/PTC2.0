import Link from "next/link";

export default function AdminScoresPage() {
  return (
    <div className="p-6 lg:p-8 max-w-4xl space-y-4">
      <h1 className="font-display text-4xl tracking-widest text-[--color-clay-500]">SCORE ENTRY</h1>
      <p className="text-sm text-[--color-text-muted]">
        Use results to review entered scores. Advanced score-entry tools are coming soon.
      </p>
      <Link href="/results" className="text-sm font-semibold text-[--color-clay-600] hover:underline">
        Open Results →
      </Link>
    </div>
  );
}
