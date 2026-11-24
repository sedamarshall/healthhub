import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Breadcrumbs } from "@/components/Listing";

/** Public content pages edited in Admin → Content Management. */
const PAGES: Record<string, { kind: string; title: string }> = {
  faq: { kind: "faq", title: "Frequently Asked Questions" },
  "privacy-policy": { kind: "privacy", title: "Privacy Policy" },
  terms: { kind: "terms", title: "Terms & Conditions" },
  "about-us": { kind: "about", title: "About Us" },
};

type Props = { params: Promise<{ page: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = PAGES[(await params).page];
  return p ? { title: p.title } : {};
}

export default async function ContentPage({ params }: Props) {
  const meta = PAGES[(await params).page];
  if (!meta) notFound();
  const rows = await prisma.page.findMany({ where: { kind: meta.kind, status: "published" }, orderBy: [{ position: "asc" }, { id: "asc" }] });

  return (
    <div className="container-x py-6">
      <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: meta.title }]} />
      <h1 className="section-title mb-8">{meta.title}</h1>
      {meta.kind === "faq" ? (
        <div className="max-w-4xl space-y-3">
          {rows.map((r) => (
            <details key={r.id} className="group rounded-2xl border border-line open:border-brand-600">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-heading text-lg font-semibold">
                {r.title}
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-well text-xl leading-none transition group-open:rotate-45 group-open:bg-brand-600 group-open:text-white">+</span>
              </summary>
              <div className="prose-hh px-5 pb-5 !text-muted" dangerouslySetInnerHTML={{ __html: r.content }} />
            </details>
          ))}
          {rows.length === 0 && <p className="text-muted">No questions yet.</p>}
        </div>
      ) : (
        <div className="max-w-4xl space-y-8">
          {rows.map((r) => (
            <section key={r.id}>
              {rows.length > 1 && <h2 className="mb-3 font-heading text-2xl font-bold">{r.title}</h2>}
              <div className="prose-hh !text-muted" dangerouslySetInnerHTML={{ __html: r.content }} />
              <p className="mt-4 text-xs text-faint">Last updated {r.updatedAt.toLocaleDateString("en-KE", { dateStyle: "long" })}</p>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
