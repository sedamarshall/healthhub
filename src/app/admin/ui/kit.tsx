// Sellzy-style admin building blocks (server-safe; interactive bits live in kit-client.tsx)
import Link from "next/link";
import { IArrowLeft, IBan, ICalendar, ICheck, IEye, IPencil, ISearch, ITrash, IX } from "./icons";
import { AutoSubmitSelect } from "./kit-client";

/** Page title row: "Product List" + actions (right). Optional back arrow. */
export function ModuleHeader({ title, back, children }: { title: string; back?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-4 flex flex-col gap-4 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
      <h3 className="flex items-center gap-2 text-lg font-bold leading-7 text-[#212529] sm:text-xl">
        {back && <Link href={back} aria-label="Back" className="flex size-8 items-center justify-center rounded-full text-[#212529] transition-colors hover:bg-[#f4f6f8]"><IArrowLeft className="h-6 w-6" /></Link>}
        {title}
      </h3>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

export function PrimaryLink({ href, children }: { href: string; children: React.ReactNode }) {
  return <Link href={href} className="inline-flex h-9 items-center justify-center rounded-full bg-[#a10fe4] px-4 text-sm font-bold text-white hover:bg-[#850cbd]">{children}</Link>;
}
export function ExportLink({ href, tone = "primary" }: { href: string; tone?: "primary" | "yellow" }) {
  return (
    <a href={href} className={`inline-flex h-9 items-center justify-center rounded-full px-4 text-sm font-bold ${tone === "yellow" ? "bg-[#ffc107] text-[#212529] hover:bg-[#ffb300]" : "bg-[#a10fe4] text-white hover:bg-[#850cbd]"}`}>
      Export
    </a>
  );
}

export type FilterDef = { name: string; label: string; options: { value: string; label: string }[] };

/** Search box (left) + pill filter selects (right). Submits as GET so filters live in the URL. */
export function Toolbar({ action, params, filters = [], placeholder = "Search..." }: { action: string; params: Record<string, string | undefined>; filters?: FilterDef[]; placeholder?: string }) {
  const keep = Object.entries(params).filter(([k, v]) => v && k !== "q" && k !== "page" && !filters.some((f) => f.name === k));
  return (
    <form action={action} className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      {keep.map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <div className="relative w-full sm:w-[300px]">
        <ISearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#212529]" />
        <input name="q" defaultValue={params.q} placeholder={placeholder} aria-label="Search" className="h-9 w-full rounded-full bg-[#f9fafb] py-2 pl-9 pr-3.5 text-sm text-[#212529] outline-none shadow-[0_0_0_1px_rgba(145,158,171,0.2)] focus:shadow-[0_0_0_2px_#a10fe4]" />
      </div>
      {filters.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.map((f) => <AutoSubmitSelect key={f.name} name={f.name} label={f.label} value={params[f.name] ?? ""} options={f.options} />)}
        </div>
      )}
    </form>
  );
}

/** Table wrapper with Sellzy header row styling. */
export function DataTable({ head, children, empty, colSpan }: { head: React.ReactNode[]; children: React.ReactNode; empty?: boolean; colSpan?: number }) {
  return (
    <div className="-mx-4 overflow-x-auto sm:-mx-6">
      <table className="w-full min-w-[760px] text-sm">
        <thead>
          <tr className="bg-[#f9fafb]">
            {head.map((h, i) => (
              <th key={i} className="whitespace-nowrap py-3 pl-5 pr-3 text-left text-sm font-semibold text-[#212529] first:pl-4 sm:first:pl-6">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="[&>tr]:border-t [&>tr]:border-[rgba(145,158,171,0.2)] [&_td]:px-3 [&_td]:py-3.5 [&_td]:text-[#212529] [&_td:first-child]:pl-4 sm:[&_td:first-child]:pl-6">
          {children}
          {empty && (
            <tr><td colSpan={colSpan ?? head.length} className="!py-12 text-center !text-[#919eab]">Nothing to show yet.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

/** Visual checkbox (selection column). Pass name/value to use it in bulk forms. */
export function Check({ name, value, label, form }: { name?: string; value?: string | number; label?: string; form?: string }) {
  return (
    <label className="relative inline-flex cursor-pointer items-center">
      <input type="checkbox" name={name} value={value} form={form} aria-label={label ?? "Select row"} className="peer sr-only" />
      <span className="flex h-5 w-5 items-center justify-center rounded border-2 border-[#919eab] text-white transition peer-checked:border-[#a10fe4] peer-checked:bg-[#a10fe4] peer-focus-visible:ring-2 peer-focus-visible:ring-[#a10fe4] [&>svg]:opacity-0 peer-checked:[&>svg]:opacity-100">
        <ICheck className="h-3 w-3" />
      </span>
    </label>
  );
}

const ICONS = { view: IEye, edit: IPencil, delete: ITrash, approve: ICheck, reject: IX, ban: IBan };
type IconKind = keyof typeof ICONS;

export function IconLink({ href, kind, label }: { href: string; kind: IconKind; label: string }) {
  const I = ICONS[kind];
  return <Link href={href} title={label} aria-label={label} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#212529] hover:bg-[#f4f6f8]"><I /></Link>;
}
/** Icon button that submits a server action (with optional hidden fields). */
export function IconAction({ action, kind, label, fields = {}, confirm }: { action: (fd: FormData) => Promise<void>; kind: IconKind; label: string; fields?: Record<string, string | number>; confirm?: string }) {
  const I = ICONS[kind];
  const tone = kind === "delete" || kind === "reject" || kind === "ban" ? "hover:text-[#cb0233]" : kind === "approve" ? "hover:text-[#a10fe4]" : "";
  return (
    <form action={action} className="inline-flex">
      {Object.entries(fields).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <ConfirmIconButton label={label} confirm={confirm} className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#212529] hover:bg-[#f4f6f8] ${tone}`}><I /></ConfirmIconButton>
    </form>
  );
}
import { ConfirmIconButton } from "./kit-client";

export function Actions({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-1">{children}</div>;
}

/** Small product/person cell with thumbnail. */
export function ThumbCell({ src, title, sub, href, round = false }: { src?: string | null; title: string; sub?: string; href?: string; round?: boolean }) {
  const initials = title.split(" ").map((x) => x[0]).join("").slice(0, 2).toUpperCase();
  const img = src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" className={`h-8 w-8 shrink-0 ${round ? "rounded-full object-cover" : "rounded-lg object-contain"}`} loading="lazy" />
  ) : (
    <span className={`flex h-8 w-8 shrink-0 items-center justify-center bg-[#efd6fc] text-[11px] font-bold text-[#850cbd] ${round ? "rounded-full" : "rounded-lg"}`}>{initials}</span>
  );
  const body = (
    <span className="min-w-0">
      <span className="block max-w-[280px] truncate">{title}</span>
      {sub && <span className="block text-xs text-[#919eab]">{sub}</span>}
    </span>
  );
  return href ? <Link href={href} className="flex items-center gap-3 hover:text-[#a10fe4]">{img}{body}</Link> : <div className="flex items-center gap-3">{img}{body}</div>;
}

/** Pastel tile with white circular icon (Orders / Coupons / Stock pages). */
export function Tile({ label, value, bg, icon }: { label: string; value: string | number; bg: string; icon: React.ReactNode }) {
  return (
    <div className="tile-tint flex items-center gap-4 rounded-2xl p-5" style={{ background: bg }}>
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-[#212529]">{icon}</span>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-[#495057]">{label}</p>
        <p className="font-num text-2xl font-bold text-[#212529]">{typeof value === "number" ? value.toLocaleString() : value}</p>
      </div>
    </div>
  );
}

/** Bordered form section ("Basic Information", "Media", ...). */
export function Section({ title, action, children, className = "" }: { title?: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-[rgba(145,158,171,0.2)] bg-white p-4 sm:p-6 ${className}`}>
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between gap-3 sm:mb-6">
          {title && <h4 className="text-lg font-bold text-[#212529]">{title}</h4>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

const field = "peer block h-14 w-full appearance-none rounded-full border border-[rgba(145,158,171,0.2)] bg-transparent px-3.5 py-4 text-sm text-[#212529] focus:border-[#a10fe4] focus:outline-none";
const floatLabel =
  "pointer-events-none absolute left-3.5 top-2 z-10 origin-left -translate-y-4 scale-75 bg-white px-1 text-sm text-[#a10fe4] duration-200 peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:scale-100 peer-placeholder-shown:bg-transparent peer-placeholder-shown:text-[#919eab] peer-focus:top-2 peer-focus:-translate-y-4 peer-focus:scale-75 peer-focus:bg-white peer-focus:text-[#a10fe4]";

/** Floating-label input exactly like the reference forms. */
export function FInput({ label, name, className = "", ...rest }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; name: string }) {
  const id = `f-${name}`;
  return (
    <div className={`relative ${className}`}>
      <input id={id} name={name} placeholder=" " className={field} {...rest} />
      <label htmlFor={id} className={floatLabel}>{label}</label>
    </div>
  );
}
export function FTextarea({ label, name, className = "", rows = 4, ...rest }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; name: string }) {
  const id = `f-${name}`;
  return (
    <div className={`relative ${className}`}>
      <textarea id={id} name={name} rows={rows} placeholder=" " className={`${field} h-auto rounded-2xl pt-5`} {...rest} />
      <label htmlFor={id} className={floatLabel.replace("peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2", "peer-placeholder-shown:top-6 peer-placeholder-shown:-translate-y-1/2")}>{label}</label>
    </div>
  );
}
/** Select with a fixed floating label. */
export function FSelect({ label, name, children, className = "", ...rest }: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string; name: string }) {
  const id = `f-${name}`;
  return (
    <div className={`relative ${className}`}>
      <select id={id} name={name} className={`${field} cursor-pointer bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%23212529%22 stroke-width=%222%22><path d=%22m6 9 6 6 6-6%22/></svg>')] bg-[length:16px] bg-[right_16px_center] bg-no-repeat pr-10`} {...rest}>
        {children}
      </select>
      <label htmlFor={id} className="pointer-events-none absolute left-3.5 top-0 z-10 -translate-y-1/2 bg-white px-1 text-xs text-[#a10fe4]">{label}</label>
    </div>
  );
}

/** On/off switch (submits "on" when checked). */
export function Toggle({ name, defaultChecked, label, hint }: { name: string; defaultChecked?: boolean; label?: string; hint?: string }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4">
      {(label || hint) && (
        <span>
          {label && <span className="block text-sm font-semibold text-[#212529]">{label}</span>}
          {hint && <span className="block text-xs text-[#495057]">{hint}</span>}
        </span>
      )}
      <span className="relative inline-flex shrink-0">
        <input type="checkbox" name={name} defaultChecked={defaultChecked} className="peer sr-only" />
        <span className="h-5 w-9 rounded-full bg-[#dfe3e8] transition peer-checked:bg-[#a10fe4]" />
        <span className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition peer-checked:translate-x-4" />
      </span>
    </label>
  );
}

/** Underlined tab links (Settings tabs). */
export function TabLinks({ tabs, active }: { tabs: { href: string; label: string; key: string }[]; active: string }) {
  return (
    <nav className="mb-6 flex gap-6 border-b border-[rgba(145,158,171,0.2)] text-sm">
      {tabs.map((t) => (
        <Link key={t.key} href={t.href} className={`-mb-px border-b-2 pb-3 font-semibold ${active === t.key ? "border-[#a10fe4] text-[#212529]" : "border-transparent text-[#637381] hover:text-[#212529]"}`}>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}

export function fmtDate(d: Date | null | undefined) {
  return d ? d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "-";
}
export function shortId(n: number) {
  return `#${String(n).padStart(5, "0")}`;
}

export function Stars({ value, size = "h-4 w-4" }: { value: number; size?: string }) {
  return (
    <span className="inline-flex gap-0.5" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} viewBox="0 0 24 24" className={`${size} ${i <= Math.round(value) ? "fill-[#ffc107]" : "fill-[#dfe3e8]"}`} aria-hidden="true">
          <path d="m12 2.8 2.8 6 6.5.6-4.9 4.3 1.5 6.4L12 16.8 6.1 20.1l1.5-6.4-4.9-4.3 6.5-.6z" />
        </svg>
      ))}
    </span>
  );
}

/**
 * Status dropdown pill in the form header (reference: "Active ▾" at the top right of Create pages).
 * Values are submitted as-is; for on/off fields use options [["on","Active"],["off","Inactive"]].
 */
export function StatusPill({ name, defaultValue, options, label = "Status", disabled }: { name: string; defaultValue: string; options: [string, string][]; label?: string; disabled?: boolean }) {
  return (
    <div className="relative w-[136px]">
      <select
        name={name}
        defaultValue={defaultValue}
        aria-label={label}
        disabled={disabled}
        className="h-[30px] w-full cursor-pointer appearance-none rounded-full border border-[#a10fe4] bg-[rgba(161,15,228,0.08)] pl-4 pr-9 text-[13px] font-bold text-[#850cbd] outline-none focus-visible:ring-2 focus-visible:ring-[#a10fe4]/30 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
      <svg viewBox="0 0 20 20" className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#850cbd]" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 7.5 5 5 5-5" /></svg>
    </div>
  );
}

/** Date/time field with a calendar icon, like the reference Start Date / End Date. */
export function FDate({ label, name, className = "", ...rest }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; name: string }) {
  const id = `f-${name}`;
  return (
    <div className={`relative ${className}`}>
      <ICalendar className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#637381]" />
      <input id={id} name={name} type="datetime-local" className="peer block h-14 w-full appearance-none rounded-full border border-[rgba(145,158,171,0.2)] bg-transparent pb-1 pl-12 pr-3.5 pt-5 text-sm text-[#212529] focus:border-[#a10fe4] focus:outline-none" {...rest} />
      <label htmlFor={id} className="pointer-events-none absolute left-12 top-2 text-xs text-[#919eab] peer-focus:text-[#a10fe4]">{label}</label>
    </div>
  );
}

export const ACTIVE_OPTIONS: [string, string][] = [["on", "Active"], ["off", "Inactive"]];
