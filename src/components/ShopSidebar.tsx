import Link from "next/link";
import { getNav } from "@/lib/catalog";

/** Left filter column on listing pages (categories + price + availability). */
export async function ShopSidebar({ base, params, activeSlug }: { base: string; params: Record<string, string | undefined>; activeSlug?: string }) {
  const nav = await getNav();
  const box = "rounded-2xl border border-line p-5";
  const title = "mb-4 font-heading text-lg font-bold";
  return (
    <aside className="space-y-6">
      <div className={box}>
        <h3 className={title}>Categories</h3>
        <ul className="max-h-[420px] space-y-1 overflow-y-auto pr-1">
          {nav.map((c) => {
            const open = c.slug === activeSlug || c.children.some((s) => s.slug === activeSlug);
            return (
              <li key={c.id}>
                <Link href={`/c/${c.slug}`} className={`flex items-center justify-between rounded-lg px-2 py-1.5 text-[15px] hover:text-brand-600 ${c.slug === activeSlug ? "font-semibold text-brand-600" : "text-ink"}`}>
                  {c.name}
                  {c.children.length > 0 && <span className="text-xs text-faint">{c.children.length}</span>}
                </Link>
                {open && c.children.length > 0 && (
                  <ul className="mb-1 ml-3 border-l border-line pl-3">
                    {c.children.map((s) => (
                      <li key={s.id}>
                        <Link href={`/c/${s.slug}`} className={`block py-1 text-sm hover:text-brand-600 ${s.slug === activeSlug ? "font-semibold text-brand-600" : "text-muted"}`}>{s.name}</Link>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      <form action={base} className={box}>
        <h3 className={title}>Filter by Price</h3>
        {params.q && <input type="hidden" name="q" value={params.q} />}
        {params.sort && <input type="hidden" name="sort" value={params.sort} />}
        <div className="flex items-center gap-2">
          <input name="minp" type="number" min={0} defaultValue={params.minp} placeholder="Min" aria-label="Minimum price (KES)" className="h-11 w-full rounded-full border border-line px-4 text-sm outline-none focus:border-brand-600" />
          <span className="text-faint">–</span>
          <input name="maxp" type="number" min={0} defaultValue={params.maxp} placeholder="Max" aria-label="Maximum price (KES)" className="h-11 w-full rounded-full border border-line px-4 text-sm outline-none focus:border-brand-600" />
        </div>
        <label className="mt-4 flex items-center gap-2 text-[15px]">
          <input type="checkbox" name="instock" value="1" defaultChecked={!!params.instock} className="h-4 w-4 accent-[#a10fe4]" /> In stock only
        </label>
        <button className="btn-primary mt-4 w-full">Apply filter</button>
        {(params.minp || params.maxp || params.instock) && (
          <Link href={params.q ? `${base}?q=${encodeURIComponent(params.q)}` : base} className="mt-2 block text-center text-sm text-muted hover:text-brand-600">Clear filters</Link>
        )}
      </form>
    </aside>
  );
}

/** Builds the Prisma price/stock filter from listing query params. */
export function listingFilters(sp: Record<string, string | undefined>) {
  const min = Number(sp.minp) || undefined;
  const max = Number(sp.maxp) || undefined;
  return {
    ...(sp.instock ? { stockStatus: { not: "out_of_stock" } } : {}),
    ...(min || max ? { price: { ...(min ? { gte: min } : {}), ...(max ? { lte: max } : {}) } } : {}),
  };
}
