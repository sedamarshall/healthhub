// Floating-label fields used on checkout / account forms (Sellzy storefront style).
const field =
  "peer block h-14 w-full appearance-none rounded-full border border-line bg-white px-5 pb-1.5 pt-5 text-[15px] text-ink outline-none transition focus:border-brand-600";
const label =
  "pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-[15px] text-faint transition-all peer-focus:top-3.5 peer-focus:text-xs peer-focus:text-brand-600 peer-[:not(:placeholder-shown)]:top-3.5 peer-[:not(:placeholder-shown)]:text-xs";

export function Field({ label: text, name, className = "", ...rest }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; name: string }) {
  const id = rest.id ?? `fld-${name}`;
  return (
    <div className={`relative ${className}`}>
      <input id={id} name={name} placeholder=" " className={field} {...rest} />
      <label htmlFor={id} className={label}>{text}</label>
    </div>
  );
}

export function FieldArea({ label: text, name, className = "", rows = 3, ...rest }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; name: string }) {
  const id = rest.id ?? `fld-${name}`;
  return (
    <div className={`relative ${className}`}>
      <textarea id={id} name={name} rows={rows} placeholder=" " className={`${field} h-auto rounded-3xl pt-7`} {...rest} />
      <label htmlFor={id} className={label.replace("top-1/2 -translate-y-1/2", "top-5")}>{text}</label>
    </div>
  );
}

export function FieldSelect({ label: text, name, className = "", children, ...rest }: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string; name: string }) {
  const id = rest.id ?? `fld-${name}`;
  return (
    <div className={`relative ${className}`}>
      <select id={id} name={name} className={`${field} cursor-pointer pr-10`} {...rest}>{children}</select>
      <label htmlFor={id} className="pointer-events-none absolute left-5 top-3.5 text-xs text-brand-600">{text}</label>
      <svg className="pointer-events-none absolute right-5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
    </div>
  );
}

/** Card with grey header strip ("Shipping Address", "Payment", ...). */
export function Panel({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-line bg-white ${className}`}>
      <h5 className="rounded-t-2xl bg-well px-4 py-4 font-heading text-xl font-bold leading-[30px] text-ink md:px-6">{title}</h5>
      <div className="px-4 py-6 md:px-6">{children}</div>
    </section>
  );
}
