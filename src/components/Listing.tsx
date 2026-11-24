import Link from "next/link";
import { ChevronLeft, ChevronRight, HomeIcon } from "./Icons";

export function SortBar({ base, params, total, shown }: { base: string; params: Record<string, string | undefined>; total: number; shown?: number }) {
  const sorts = [
    ["popular", "Popularity"],
    ["newest", "Newest"],
    ["price-asc", "Price: low to high"],
    ["price-desc", "Price: high to low"],
    ["name", "Name A–Z"],
  ];
  const current = params.sort || "popular";
  const href = (patch: Record<string, string | undefined>) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...params, ...patch, page: undefined })) if (v) sp.set(k, v);
    const s = sp.toString();
    return s ? `${base}?${s}` : base;
  };
  return (
    <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-line px-4 py-3">
      <p className="mr-auto text-[15px] text-muted">
        Showing <b className="text-ink">{shown ?? total}</b> of <b className="text-ink">{total.toLocaleString()}</b> results
      </p>
      <Link href={href({ instock: params.instock ? undefined : "1" })} className={`rounded-full border px-4 py-2 text-sm font-medium ${params.instock ? "border-brand-600 bg-brand-600 text-white" : "border-line"}`}>
        In stock only
      </Link>
      <details className="group relative">
        <summary className="flex cursor-pointer list-none items-center gap-2 rounded-full border border-line px-4 py-2 text-sm font-medium">
          Sort by: <span className="text-brand-600">{sorts.find(([k]) => k === current)?.[1]}</span>
        </summary>
        <div className="absolute right-0 z-30 mt-2 w-52 rounded-2xl border border-line bg-white py-2 shadow-xl">
          {sorts.map(([k, label]) => (
            <Link key={k} href={href({ sort: k === "popular" ? undefined : k })} className={`block px-4 py-2 text-sm hover:bg-well ${current === k ? "font-semibold text-brand-600" : ""}`}>{label}</Link>
          ))}
        </div>
      </details>
    </div>
  );
}

export function Pagination({ base, params, page, pages }: { base: string; params: Record<string, string | undefined>; page: number; pages: number }) {
  if (pages <= 1) return null;
  const href = (p: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...params, page: p > 1 ? String(p) : undefined })) if (v) sp.set(k, v);
    const s = sp.toString();
    return s ? `${base}?${s}` : base;
  };
  const nums = [...new Set([1, page - 1, page, page + 1, pages])].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);
  const btn = "flex h-11 min-w-11 items-center justify-center rounded-full px-2 text-[15px] font-semibold";
  return (
    <nav className="mt-10 flex items-center justify-center gap-2" aria-label="Pagination">
      {page > 1 && <Link href={href(page - 1)} className={`${btn} border border-line`} aria-label="Previous page"><ChevronLeft /></Link>}
      {nums.map((n, i) => (
        <span key={n} className="flex items-center gap-2">
          {i > 0 && n - nums[i - 1] > 1 && <span className="text-muted">…</span>}
          <Link href={href(n)} aria-current={n === page ? "page" : undefined} className={`${btn} ${n === page ? "bg-brand-600 text-white" : "border border-line hover:border-brand-600"}`}>{n}</Link>
        </span>
      ))}
      {page < pages && <Link href={href(page + 1)} className={`${btn} border border-line`} aria-label="Next page"><ChevronRight /></Link>}
    </nav>
  );
}

export function Breadcrumbs({ items }: { items: { name: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-6 text-[15px]">
      <ol className="flex flex-wrap items-center gap-2">
        {items.map((c, i) => (
          <li key={i} className="flex items-center gap-2">
            {i > 0 && <span className="h-1 w-1 rounded-full bg-faint" />}
            {c.href ? (
              <Link href={c.href} className="flex items-center gap-1.5 text-ink hover:text-brand-600">{i === 0 && <HomeIcon className="h-[18px] w-[18px]" />}{c.name}</Link>
            ) : (
              <span className="text-faint">{c.name}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
