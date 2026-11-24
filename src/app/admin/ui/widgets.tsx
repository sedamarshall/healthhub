import Link from "next/link";
import { tileStyle } from "@/lib/tile";
import { ITrendDown, ITrendUp, IChevronLeft, IChevronRight } from "./icons";

// ---------- Stat card ----------
export function StatCard({ label, value, change, bg, href }: { label: string; value: string; change?: number | null; bg: string; href?: string }) {
  const up = (change ?? 0) >= 0;
  const Box = ({ children }: { children: React.ReactNode }) =>
    href ? (
      <Link href={href} className="tile-tint block rounded-2xl p-6 transition hover:-translate-y-0.5 hover:shadow-[0_8px_16px_rgba(145,158,171,0.24)] focus-visible:outline-2 focus-visible:outline-[#a10fe4]" style={tileStyle(bg)} aria-label={`${label}: ${value}`}>{children}</Link>
    ) : (
      <div className="tile-tint rounded-2xl p-6" style={tileStyle(bg)}>{children}</div>
    );
  return (
    <Box>
      <p className="tile-label text-sm font-semibold text-[#495057]">{label}</p>
      <div className="mt-1 flex items-end justify-between gap-2">
        <p className="tile-value font-num text-2xl font-bold text-[#212529]">{value}</p>
        {change !== undefined && change !== null && (
          <span className={`tile-pill inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-xs font-semibold ${up ? "text-[#a10fe4]" : "tile-pill-down text-[#cb0233]"}`}>
            {up ? "+" : ""}
            {change.toFixed(1)}%{up ? <ITrendUp /> : <ITrendDown />}
          </span>
        )}
      </div>
    </Box>
  );
}

// ---------- Panel ----------
export function Panel({ title, subtitle, action, children, className = "" }: { title?: string; subtitle?: React.ReactNode; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-[#dfe3e8] bg-white ${className}`}>
      {(title || action) && (
        <div className="flex flex-wrap items-start justify-between gap-2 px-6 pt-6">
          <div>
            {title && <h2 className="text-lg font-bold text-[#212529]">{title}</h2>}
            {subtitle && <p className="mt-1 text-sm text-[#495057]">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function PageTitle({ title, subtitle, action }: { title: string; subtitle?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold text-[#212529]">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-[#495057]">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

// ---------- Badges ----------
const ORDER_BADGE: Record<string, [string, string]> = {
  awaiting_rx: ["adm-badge-purple", "Awaiting Rx review"],
  pending_payment: ["adm-badge-warning", "Awaiting payment"],
  paid: ["adm-badge-info", "Processing"],
  processing: ["adm-badge-info", "Processing"],
  shipped: ["adm-badge-purple", "Out for delivery"],
  delivered: ["adm-badge-success", "Delivered"],
  cancelled: ["adm-badge-danger", "Cancelled"],
};
export function OrderBadge({ status }: { status: string }) {
  const [cls, label] = ORDER_BADGE[status] ?? ["adm-badge-neutral", status];
  return <span className={`adm-badge ${cls}`}>{label}</span>;
}
export function Badge({ tone, children }: { tone: "warning" | "success" | "danger" | "info" | "neutral" | "purple"; children: React.ReactNode }) {
  return <span className={`adm-badge adm-badge-${tone}`}>{children}</span>;
}

// ---------- Pagination ----------
export function AdminPagination({ base, params, page, pages, param = "page" }: { base: string; params: Record<string, string | undefined>; page: number; pages: number; param?: string }) {
  if (pages <= 1) return null;
  const href = (p: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...params, [param]: p > 1 ? String(p) : undefined })) if (v) sp.set(k, v);
    const s = sp.toString();
    return s ? `${base}?${s}` : base;
  };
  const nums = [...new Set([1, page - 1, page, page + 1, pages])].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);
  const btn = "flex h-[30px] min-w-[40px] items-center justify-center rounded-full px-2 text-sm font-semibold";
  return (
    <nav className="flex items-center justify-end gap-1 px-6 py-5" aria-label="Pagination">
      {page > 1 ? <Link href={href(page - 1)} className={`${btn} text-[#495057]`} aria-label="Previous"><IChevronLeft /></Link> : <span className={`${btn} text-[#dfe3e8]`}><IChevronLeft /></span>}
      {nums.map((n, i) => (
        <span key={n} className="flex items-center gap-1">
          {i > 0 && n - nums[i - 1] > 1 && <span className="px-1 text-[#495057]">…</span>}
          <Link href={href(n)} aria-current={n === page ? "page" : undefined} className={`${btn} ${n === page ? "bg-[#efd6fc] text-[#850cbd]" : "text-[#495057] hover:bg-[#f9fafb]"}`}>{n}</Link>
        </span>
      ))}
      {page < pages ? <Link href={href(page + 1)} className={`${btn} text-[#495057]`} aria-label="Next"><IChevronRight /></Link> : <span className={`${btn} text-[#dfe3e8]`}><IChevronRight /></span>}
    </nav>
  );
}

// ---------- Charts (plain SVG) ----------
export function PieChart({ data, size = 220 }: { data: { label: string; value: number; color: string }[]; size?: number }) {
  const total = data.reduce((a, d) => a + d.value, 0);
  const r = size / 2;
  if (!total) {
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="No orders yet">
        <circle cx={r} cy={r} r={r - 1} fill="#f1f3f5" />
        <text x={r} y={r + 5} textAnchor="middle" fontSize="13" fill="#495057">No orders yet</text>
      </svg>
    );
  }
  let angle = -Math.PI / 2;
  const slices = data.filter((d) => d.value > 0).map((d) => {
    const a = (d.value / total) * Math.PI * 2;
    const x1 = r + r * Math.cos(angle), y1 = r + r * Math.sin(angle);
    angle += a;
    const x2 = r + r * Math.cos(angle), y2 = r + r * Math.sin(angle);
    const path = a >= Math.PI * 2 - 1e-6 ? null : `M${r},${r} L${x1},${y1} A${r},${r} 0 ${a > Math.PI ? 1 : 0} 1 ${x2},${y2} Z`;
    return { ...d, path };
  });
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Order status breakdown">
      {slices.map((s) =>
        s.path ? <path key={s.label} d={s.path} fill={s.color} stroke="#fff" strokeWidth="1"><title>{`${s.label}: ${s.value}`}</title></path> : <circle key={s.label} cx={r} cy={r} r={r} fill={s.color}><title>{`${s.label}: ${s.value}`}</title></circle>,
      )}
    </svg>
  );
}

export function BarChart({ data, height = 220 }: { data: { label: string; value: number }[]; height?: number }) {
  const max = Math.max(10_000, ...data.map((d) => d.value));
  const nice = niceMax(max);
  const ticks = [0, 0.2, 0.4, 0.6, 0.8, 1].map((t) => t * nice);
  const W = 680, H = height, left = 44, bottom = 24, top = 8;
  const plotH = H - bottom - top;
  const step = (W - left) / data.length;
  const bw = Math.min(26, step * 0.5);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Monthly revenue">
      {ticks.map((t) => {
        const y = top + plotH - (t / nice) * plotH;
        return (
          <g key={t}>
            <line x1={left} x2={W} y1={y} y2={y} stroke="#e9ecef" strokeDasharray="4 4" />
            <text x={left - 8} y={y + 4} textAnchor="end" fontSize="11" fill="#919eab">{short(t)}</text>
          </g>
        );
      })}
      {data.map((d, i) => {
        const h = (d.value / nice) * plotH;
        const x = left + i * step + (step - bw) / 2;
        return (
          <g key={d.label}>
            <rect x={x} y={top + plotH - h} width={bw} height={Math.max(h, 0)} rx="3" fill={i % 2 === 0 ? "#ffc727" : "#2a9d8f"}>
              <title>{`${d.label}: KES ${d.value.toLocaleString()}`}</title>
            </rect>
            <text x={x + bw / 2} y={H - 6} textAnchor="middle" fontSize="11" fill="#919eab">{d.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

export function Sparkline({ values, color }: { values: number[]; color: string }) {
  const W = 70, H = 24;
  const max = Math.max(1, ...values), min = Math.min(...values);
  const pts = values.map((v, i) => `${(i / Math.max(1, values.length - 1)) * W},${H - 2 - ((v - min) / Math.max(1, max - min)) * (H - 4)}`).join(" ");
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

export function Progress({ label, value, total, color, track }: { label: string; value: number; total: number; color: string; track: string }) {
  const pct = total ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="mb-2 flex justify-between text-sm">
        <span className="font-semibold text-[#212529]">{label}</span>
        <span className="text-[#212529]"><b>{value}</b> ({String(pct).padStart(2, "0")}%)</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full" style={{ background: track }}>
        <div className="h-full rounded-full" style={{ width: `${Math.max(pct, value ? 2 : 0)}%`, background: color }} />
      </div>
    </div>
  );
}

function niceMax(v: number) {
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * p >= v) return m * p;
  return 10 * p;
}
export function short(n: number) {
  if (n >= 1_000_000) return `${+(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${+(n / 1000).toFixed(1)}k`;
  return String(Math.round(n));
}

/** Multi-series line/area chart (plain SVG). Smooth curves when `smooth`. */
export function LineChart({
  labels,
  series,
  height = 260,
  smooth = false,
  area = false,
}: {
  labels: string[];
  series: { name: string; color: string; values: number[] }[];
  height?: number;
  smooth?: boolean;
  area?: boolean;
}) {
  const W = 760, H = height, left = 44, bottom = 26, top = 10, right = 10;
  const max = niceMax(Math.max(10_000, ...series.flatMap((s) => s.values)));
  const plotH = H - top - bottom, plotW = W - left - right;
  const x = (i: number) => left + (labels.length <= 1 ? 0 : (i / (labels.length - 1)) * plotW);
  const y = (v: number) => top + plotH - (v / max) * plotH;
  const path = (vals: number[]) => {
    if (!smooth) return vals.map((v, i) => `${i ? "L" : "M"}${x(i)},${y(v)}`).join(" ");
    return vals
      .map((v, i) => {
        if (i === 0) return `M${x(0)},${y(v)}`;
        const cx = (x(i - 1) + x(i)) / 2;
        return `C${cx},${y(vals[i - 1])} ${cx},${y(v)} ${x(i)},${y(v)}`;
      })
      .join(" ");
  };
  return (
    <div>
      <div className="mb-2 flex justify-end gap-4 text-xs text-[#212529]">
        {series.map((s) => (
          <span key={s.name} className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full border-2" style={{ borderColor: s.color, background: area ? s.color : "transparent" }} />{s.name}</span>
        ))}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={series.map((s) => s.name).join(" and ")}>
        <defs>
          {series.map((s, i) => (
            <linearGradient key={i} id={`grad-${i}-${s.color.slice(1)}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity="0.18" />
              <stop offset="100%" stopColor={s.color} stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>
        {[0, 0.2, 0.4, 0.6, 0.8, 1].map((t) => (
          <g key={t}>
            <line x1={left} x2={W - right} y1={y(t * max)} y2={y(t * max)} stroke="#f1f3f5" />
            <text x={left - 8} y={y(t * max) + 4} textAnchor="end" fontSize="11" fill="#919eab">{short(t * max)}</text>
          </g>
        ))}
        {labels.map((l, i) => (
          <text key={i} x={x(i)} y={H - 6} textAnchor="middle" fontSize="11" fill="#919eab">{l}</text>
        ))}
        {series.map((s, i) => (
          <g key={s.name}>
            {area && <path d={`${path(s.values)} L${x(s.values.length - 1)},${top + plotH} L${x(0)},${top + plotH} Z`} fill={`url(#grad-${i}-${s.color.slice(1)})`} />}
            <path d={path(s.values)} fill="none" stroke={s.color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
          </g>
        ))}
      </svg>
    </div>
  );
}

/** Outlined payment-status pill (paid / pending / unpaid), as in the reference Orders table. */
export function PayOutline({ status }: { status: string }) {
  const map: Record<string, string> = {
    paid: "border-[#22c55e] text-[#118d57]",
    pending: "border-[#ffab00] text-[#b76e00]",
    unpaid: "border-[#ff5630] text-[#b71d18]",
    failed: "border-[#ff5630] text-[#b71d18]",
  };
  return <span className={`adm-badge border bg-transparent ${map[status] ?? "border-[#919eab] text-[#495057]"}`}>{status}</span>;
}
