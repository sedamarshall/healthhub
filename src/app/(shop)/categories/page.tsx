import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getCategoryDirectory } from "@/lib/catalog";
import { Breadcrumbs, Pagination } from "@/components/Listing";
import { CategoryIcon } from "@/components/CategoryIcon";
import { RailArrows } from "@/components/RailArrows";
import { ScrollToActive } from "@/components/ScrollToActive";

export const metadata: Metadata = {
  title: "All Categories",
  description: "Browse every category at Health Hub Chemist: medicines, vitamins, skin care, baby & mum, first aid, devices and more.",
  alternates: { canonical: "/categories" },
};

const PER_PAGE = 32; // 4 full rows of 8 on desktop

export default async function CategoriesPage({ searchParams }: { searchParams: Promise<{ group?: string; page?: string }> }) {
  const sp = await searchParams;
  const all = await getCategoryDirectory();
  const groups = all.filter((c) => c.depth === 0).sort((a, b) => a.position - b.position || a.name.localeCompare(b.name));
  const group = groups.find((g) => g.slug === sp.group);

  // All: the main groups first, then every sub-category, biggest first.
  // A group: its sub-categories (any depth), biggest first; a group without any shows itself.
  let list = group
    ? all.filter((c) => c.topId === group.id && c.id !== group.id).sort((a, b) => b.count - a.count)
    : [...groups, ...all.filter((c) => c.depth > 0).sort((a, b) => b.count - a.count)];
  if (group && !list.length) list = [group];

  const pages = Math.max(1, Math.ceil(list.length / PER_PAGE));
  const page = Math.min(pages, Math.max(1, Number(sp.page) || 1));
  const shown = list.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const pill = (active: boolean) =>
    `shrink-0 whitespace-nowrap rounded-full px-5 py-2.5 text-[15px] font-semibold transition-colors ${active ? "bg-brand-600 text-white" : "border border-line bg-white text-ink hover:border-brand-600 hover:text-brand-600"}`;

  return (
    <div className="container-x py-6 sm:py-8">
      <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Categories", href: group ? "/categories" : undefined }, ...(group ? [{ name: group.name }] : [])]} />

      <header className="mx-auto mb-8 max-w-[560px] text-center sm:mb-10">
        <h1 className="font-heading text-3xl font-bold text-ink sm:text-[44px] sm:leading-tight">Explore All Categories</h1>
        <p className="mt-3 text-[15px] text-muted">Find exactly what you&apos;re looking for. Browse our full range of medicines, vitamins, personal care and health products.</p>
      </header>

      {/* Group filter */}
      <div className="mb-8 flex items-center gap-3">
        <nav id="cat-groups" aria-label="Category groups" className="scrollbar-none relative flex flex-1 gap-2 overflow-x-auto scroll-smooth">
          <Link href="/categories" className={pill(!group)} aria-current={!group ? "page" : undefined}>All Categories</Link>
          {groups.map((g) => (
            <Link key={g.id} href={`/categories?group=${g.slug}`} className={pill(group?.id === g.id)} aria-current={group?.id === g.id ? "page" : undefined}>
              {g.name}
            </Link>
          ))}
        </nav>
        <div className="hidden sm:block"><RailArrows target="cat-groups" /></div>
        <ScrollToActive key={group?.slug ?? "all"} target="cat-groups" />
      </div>

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
        {shown.map((c) => (
          <li key={c.id}>
            <Link href={`/c/${c.slug}`} className="group block" title={c.name}>
              <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-2xl border border-line bg-white transition group-hover:border-brand-600 group-hover:shadow-[0_8px_20px_rgba(161,15,228,0.12)]">
                {c.image ? (
                  <Image src={c.image} alt="" fill sizes="(max-width: 640px) 45vw, 180px" className="object-contain p-5 transition duration-300 group-hover:scale-105" />
                ) : (
                  <CategoryIcon slug={c.slug} name={c.name} size={64} />
                )}
              </div>
              <p className="mt-3 truncate text-center text-[15px] font-semibold text-ink group-hover:text-brand-600">{c.name}</p>
              <p className="text-center text-xs text-muted">{c.count.toLocaleString()} product{c.count === 1 ? "" : "s"}</p>
            </Link>
          </li>
        ))}
      </ul>

      {group && (
        <div className="mt-8 flex justify-center">
          <Link href={`/c/${group.slug}`} className="inline-flex h-12 items-center gap-2 rounded-full bg-brand-600 px-6 text-[15px] font-semibold text-white hover:bg-brand-700">
            Shop all {group.name} ({group.count.toLocaleString()})
          </Link>
        </div>
      )}

      <Pagination base="/categories" params={{ group: group?.slug }} page={page} pages={pages} />
    </div>
  );
}

