import { prisma } from "@/lib/db";

/** Categories flattened in tree order with depth, for checkbox lists and parent pickers. */
export async function categoryTree() {
  const all = await prisma.category.findMany({ orderBy: [{ position: "asc" }, { name: "asc" }] });
  const byParent = new Map<number | null, typeof all>();
  for (const c of all) byParent.set(c.parentId, [...(byParent.get(c.parentId) ?? []), c]);
  const out: ((typeof all)[number] & { depth: number })[] = [];
  const walk = (parent: number | null, depth: number) => {
    for (const c of byParent.get(parent) ?? []) {
      out.push({ ...c, depth });
      walk(c.id, depth + 1);
    }
  };
  walk(null, 0);
  return out;
}
