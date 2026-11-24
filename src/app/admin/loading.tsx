/** Shown instantly while an admin page loads, so clicks never look ignored. */
export default function AdminLoading() {
  return (
    <div role="status" aria-label="Loading" className="animate-pulse space-y-6">
      <div className="h-8 w-56 rounded-lg bg-white/80" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => <div key={i} className="h-24 rounded-2xl bg-white/80" />)}
      </div>
      <div className="h-[360px] rounded-2xl bg-white/80" />
    </div>
  );
}
