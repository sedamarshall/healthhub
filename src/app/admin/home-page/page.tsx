import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { deleteHomeBlock, toggleHomeBlock } from "../actions-more";
import { Actions, DataTable, IconAction, IconLink, ModuleHeader, PrimaryLink, Toolbar, fmtDate } from "../ui/kit";
import { Badge } from "../ui/widgets";

export const metadata = { title: "Home Page Control" };
const TYPE: Record<string, string> = { hero: "Hero slider", promo: "Promo banner" };

/** Home Page Control (reference): the hero slides and promo banners shown on the shop's home page. */
export default async function HomePageControl({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireStaff(["admin"]);
  const sp = await searchParams;
  const where: Prisma.HomeBlockWhereInput = {
    ...(sp.q ? { OR: [{ name: { contains: sp.q } }, { title: { contains: sp.q } }, { slug: { contains: sp.q } }] } : {}),
    ...(sp.status === "active" ? { isActive: true } : sp.status === "inactive" ? { isActive: false } : {}),
    ...(sp.type ? { type: sp.type } : {}),
  };
  const rows = await prisma.homeBlock.findMany({ where, orderBy: [{ type: "asc" }, { position: "asc" }, { id: "asc" }] });
  const now = new Date();
  const live = (b: (typeof rows)[number]) => b.isActive && (!b.startsAt || b.startsAt <= now) && (!b.endsAt || b.endsAt > now);

  return (
    <div>
      <ModuleHeader title="Home Page Control">
        <PrimaryLink href="/admin/home-page/new">Add Block</PrimaryLink>
      </ModuleHeader>
      <Toolbar
        action="/admin/home-page"
        params={sp}
        filters={[
          { name: "status", label: "Status", options: [{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }] },
          { name: "type", label: "Type", options: Object.entries(TYPE).map(([value, label]) => ({ value, label })) },
        ]}
      />
      <DataTable head={["Block Name", "Slug", "Type", "Order", "Schedule", "Status", "Action"]} empty={!rows.length}>
        {rows.map((b) => (
          <tr key={b.id}>
            <td>
              <Link href={`/admin/home-page/${b.id}`} className="flex items-center gap-3 hover:text-[#a10fe4]">
                <span className="h-10 w-16 shrink-0 overflow-hidden rounded-lg" style={{ background: b.type === "promo" ? b.bgColor : "#560879" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {b.image && <img src={b.image} alt="" className="h-full w-full object-contain" />}
                </span>
                <span className="font-semibold">{b.name}</span>
              </Link>
            </td>
            <td className="!text-[#495057]">{b.slug}</td>
            <td>{TYPE[b.type] ?? b.type}</td>
            <td>{b.position}</td>
            <td className="whitespace-nowrap text-xs !text-[#637381]">{b.startsAt || b.endsAt ? `${b.startsAt ? fmtDate(b.startsAt) : "Now"} → ${b.endsAt ? fmtDate(b.endsAt) : "No end"}` : "Always"}</td>
            <td>
              <form action={toggleHomeBlock}>
                <input type="hidden" name="id" value={b.id} />
                <button title="Click to switch on or off">
                  <Badge tone={live(b) ? "success" : b.isActive ? "warning" : "neutral"}>{live(b) ? "Active" : b.isActive ? "Scheduled" : "Inactive"}</Badge>
                </button>
              </form>
            </td>
            <td>
              <Actions>
                <IconLink href="/" kind="view" label="View home page" />
                <IconLink href={`/admin/home-page/${b.id}`} kind="edit" label="Edit block" />
                <IconAction action={deleteHomeBlock} kind="delete" label="Delete block" fields={{ id: b.id }} confirm={`Delete "${b.name}"? It will disappear from the home page.`} />
              </Actions>
            </td>
          </tr>
        ))}
      </DataTable>
      <p className="mt-4 text-xs text-[#919eab]">Hero slides rotate at the top of the home page. Promo banners show three across, below the product tabs. Lower order numbers show first.</p>
    </div>
  );
}
