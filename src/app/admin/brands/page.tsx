import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { deleteBrand } from "../actions-more";
import { IconAction, ModuleHeader, PrimaryLink, Toolbar } from "../ui/kit";
import { AdminPagination } from "../ui/widgets";

export const metadata = { title: "Brands" };
const PER = 24;

export default async function BrandList({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireStaff(["admin"]);
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const where = sp.q ? { name: { contains: sp.q } } : {};
  const [total, brands] = await Promise.all([
    prisma.brand.count({ where }),
    prisma.brand.findMany({ where, orderBy: { name: "asc" }, skip: (page - 1) * PER, take: PER }),
  ]);
  const counts = await prisma.product.groupBy({ by: ["brand"], where: { brand: { in: brands.map((b) => b.name) } }, _count: { _all: true } });
  const count = (n: string) => counts.find((c) => c.brand === n)?._count._all ?? 0;

  return (
    <div>
      <ModuleHeader title="Brand List">
        <PrimaryLink href="/admin/brands/new">Create Brand</PrimaryLink>
      </ModuleHeader>
      <Toolbar action="/admin/brands" params={sp} />
      {brands.length === 0 ? (
        <p className="py-12 text-center text-sm text-[#919eab]">No brands yet. Brands are added automatically when you set one on a product, or create one here.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {brands.map((b) => (
            <div key={b.id} className="group relative">
              <Link href={`/admin/brands/${b.id}`} className="block">
                <div className="flex aspect-[16/10] items-center justify-center rounded-xl bg-[#f4f6f8] p-4">
                  {b.logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={b.logo} alt={b.name} className="max-h-full max-w-full object-contain" />
                  ) : (
                    <span className="flex items-center gap-2 text-lg font-bold text-[#4c3ad4]">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#4c3ad4] text-sm text-white">{b.name[0]}</span>
                      {b.name.split(" ")[0]}
                    </span>
                  )}
                </div>
                <p className="mt-2 truncate text-sm font-medium text-[#212529]">{b.name}</p>
                <p className="text-xs text-[#919eab]">{count(b.name)} items</p>
              </Link>
              <div className="absolute right-1 top-1 opacity-0 transition group-hover:opacity-100">
                <IconAction action={deleteBrand} kind="delete" label={`Delete ${b.name}`} fields={{ id: b.id }} confirm={`Delete brand "${b.name}"? Products keep their details but lose the brand.`} />
              </div>
            </div>
          ))}
        </div>
      )}
      <AdminPagination base="/admin/brands" params={{ q: sp.q }} page={page} pages={Math.ceil(total / PER)} />
    </div>
  );
}
