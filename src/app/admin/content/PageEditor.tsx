import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { savePage } from "../actions-more";
import { FInput, FTextarea, ModuleHeader, Section, StatusPill } from "../ui/kit";
import { ActionForm, SaveButtons } from "../ui/kit-client";

const LABELS: Record<string, { name: string; title: string; content: string }> = {
  faq: { name: "FAQ", title: "Question", content: "Answer (HTML allowed: <p>, <ul>, <strong>)" },
  privacy: { name: "Privacy Policy", title: "Title", content: "Details (HTML allowed)" },
  terms: { name: "Terms & Condition", title: "Title", content: "Details (HTML allowed)" },
  about: { name: "About Us section", title: "Title", content: "Details (HTML allowed)" },
};

export async function PageEditor({ kind, id }: { kind: string; id?: number }) {
  const l = LABELS[kind];
  if (!l) notFound();
  const page = id ? await prisma.page.findUnique({ where: { id } }) : null;
  if (id && (!page || page.kind !== kind)) notFound();
  return (
    <ActionForm action={savePage}>
      {page && <input type="hidden" name="id" value={page.id} />}
      <input type="hidden" name="kind" value={kind} />
      <ModuleHeader title={`${page ? "Edit" : "Create New"} ${l.name}`} back={`/admin/content/${kind}`}>
        <StatusPill name="status" defaultValue={page?.status ?? "published"} options={[["published", "Published"], ["draft", "Draft"]]} />
      </ModuleHeader>
      <Section title="Basic Information">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_160px] sm:gap-6">
          <FInput label={l.title} name="title" required defaultValue={page?.title} />
          <FInput label="Sort order" name="position" type="number" defaultValue={page?.position ?? 0} />
          <FTextarea label={l.content} name="content" rows={10} required defaultValue={page?.content} className="sm:col-span-2" />
        </div>
      </Section>
      <SaveButtons cancel={`/admin/content/${kind}`} />
    </ActionForm>
  );
}
