"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { placeOrder, type CheckoutState } from "@/app/actions/checkout";
import { login, type AuthState } from "@/app/actions/auth";
import { Field, FieldArea, FieldSelect } from "./Field";

type Zone = { id: string; group: string; title: string; note: string; fee: number; freeOver: boolean; needsAddress: boolean };
type Line = { id: number; name: string; qty: number; unit: string; was?: string; image?: string; rx: boolean };
type Defaults = { firstName?: string; lastName?: string; email?: string; phone?: string; county?: string; city?: string; address1?: string; address2?: string };

const COUNTIES = ["Nairobi", "Mombasa", "Kisumu", "Nakuru", "Kiambu", "Machakos", "Kajiado", "Uasin Gishu", "Kakamega", "Kilifi", "Kwale", "Meru", "Nyeri", "Murang'a", "Kirinyaga", "Embu", "Kericho", "Bomet", "Kisii", "Nyamira", "Migori", "Homa Bay", "Siaya", "Busia", "Bungoma", "Trans Nzoia", "Nandi", "Elgeyo-Marakwet", "Baringo", "Laikipia", "Nyandarua", "Narok", "Kitui", "Makueni", "Taita-Taveta", "Lamu", "Tana River", "Garissa", "Wajir", "Mandera", "Marsabit", "Isiolo", "Samburu", "Turkana", "West Pokot", "Tharaka-Nithi", "Vihiga"];

const PAY: { id: "ipay"; label: string; badge: React.ReactNode; text: string }[] = [
  {
    id: "ipay",
    label: "iPay (M-Pesa, Airtel Money, Card)",
    badge: (
      <span className="flex flex-wrap justify-end gap-1">
        <span className="rounded-md bg-[#4caf50] px-2 py-1 text-[10px] font-black text-white">M-PESA</span>
        <span className="rounded-md bg-[#e40000] px-2 py-1 text-[10px] font-black text-white">AIRTEL</span>
        <span className="rounded-md bg-[#1a1f71] px-2 py-1 text-[10px] font-black text-white">VISA</span>
      </span>
    ),
    text: "After you confirm, you'll pay on iPay's secure page with M-Pesa, Airtel Money or a Visa / Mastercard card, then come back to your order.",
  },
];

/** Reference radio / checkbox: 20px control, 40px round hover halo. */
function Choice({ type = "radio", ...rest }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <span className="relative -m-2.5 flex size-10 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-[rgba(145,158,171,0.08)] has-[:checked]:hover:bg-[rgba(161,15,228,0.08)]">
      <input type={type} className="peer absolute inset-0 cursor-pointer opacity-0" {...rest} />
      {type === "checkbox" ? (
        <span className="flex size-5 items-center justify-center rounded-[5px] border-2 border-[#637381] text-white transition-colors peer-checked:border-brand-600 peer-checked:bg-brand-600 peer-focus-visible:ring-2 peer-focus-visible:ring-brand-600/40 [&>svg]:opacity-0 peer-checked:[&>svg]:opacity-100">
          <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
        </span>
      ) : (
        <span className="flex size-5 items-center justify-center rounded-full border-2 border-[#637381] transition-colors after:size-2 after:scale-0 after:rounded-full after:bg-brand-600 after:transition-transform peer-checked:border-brand-600 peer-checked:after:scale-100 peer-focus-visible:ring-2 peer-focus-visible:ring-brand-600/40" />
      )}
    </span>
  );
}

const option = "flex cursor-pointer items-center gap-3 text-base text-ink";
const primaryBtn = "inline-flex h-12 items-center justify-center rounded-[80px] bg-brand-600 px-8 text-base font-semibold text-white shadow-[0_8px_16px_rgba(161,15,228,0.24)] transition hover:bg-brand-700 disabled:opacity-60";

/** One step of the checkout, like the old site's "Step N: ..." panels. */
function Step({ n, title, current, done, summary, onEdit, children }: { n: number; title: string; current: boolean; done: boolean; summary?: React.ReactNode; onEdit?: () => void; children: React.ReactNode }) {
  return (
    <section className={`rounded-2xl border bg-white transition-colors ${current ? "border-brand-600" : "border-line"}`} aria-current={current ? "step" : undefined}>
      <header className={`flex items-center gap-3 px-4 py-4 md:px-6 ${current ? "rounded-t-2xl bg-well" : ""}`}>
        <span className={`flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${done && !current ? "bg-brand-600 text-white" : current ? "bg-brand-600 text-white" : "bg-well text-faint"}`}>
          {done && !current ? (
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
          ) : n}
        </span>
        <h5 className={`flex-1 font-heading text-lg font-bold md:text-xl ${current || done ? "text-ink" : "text-faint"}`}>Step {n}: {title}</h5>
        {done && !current && onEdit && <button type="button" onClick={onEdit} className="text-sm font-semibold text-brand-600 hover:underline">Edit</button>}
      </header>
      {done && !current && summary && <div className="-mt-1 px-4 pb-4 pl-[60px] text-sm text-muted md:px-6 md:pl-[68px]">{summary}</div>}
      {/* Steps stay in the DOM (hidden) so the whole form submits together at the end. */}
      <div className={current ? "px-4 pb-6 pt-2 md:px-6" : "hidden"}>{children}</div>
    </section>
  );
}

function LoginBox() {
  const [state, action, pending] = useActionState<AuthState, FormData>(login, {});
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value="/checkout" />
      <h6 className="text-base font-semibold text-ink">Returning Customer</h6>
      <p className="-mt-2 text-sm text-muted">I am a returning customer</p>
      <Field label="E-Mail" name="email" id="login-email" type="email" autoComplete="email" required defaultValue={state.email} />
      <Field label="Password" name="password" id="login-password" type="password" autoComplete="current-password" required />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/forgot-password" className="text-sm font-semibold text-brand-600">Forgotten Password</Link>
        <button disabled={pending} className={primaryBtn}>{pending ? "Signing in…" : "Login"}</button>
      </div>
      {state.error && <p className="text-sm text-sale" role="alert">{state.error}</p>}
    </form>
  );
}

export function CheckoutForm({
  zones, lines, subtotal, discount, couponCode, freeOver, hasRx, payMethods, defaults, signedIn, couponSlot, noPayment = false,
}: {
  zones: Zone[];
  lines: Line[];
  subtotal: number;
  discount: number;
  couponCode?: string;
  freeOver: number;
  hasRx: boolean;
  payMethods: { ipay: boolean };
  defaults: Defaults;
  signedIn: { name: string; email: string } | null;
  couponSlot?: React.ReactNode;
  noPayment?: boolean;
}) {
  const [state, action, pending] = useActionState<CheckoutState, FormData>(placeOrder, {});
  const f = state.fields ?? {};
  const first = signedIn ? 2 : 1;
  const [step, setStep] = useState(first);
  const [reached, setReached] = useState(first);
  const [account, setAccount] = useState<"guest" | "register">(f.account === "register" ? "register" : "guest");
  const [shipDifferent, setShipDifferent] = useState(f.shipDifferent === "1");
  const [zone, setZone] = useState(f.zone && zones.some((x) => x.id === f.zone) ? f.zone : zones[0]?.id ?? "");
  const [pay, setPay] = useState<string>("ipay");
  const [snap, setSnap] = useState<Record<string, string>>({});
  const formRef = useRef<HTMLFormElement>(null);
  const top = useRef<HTMLDivElement>(null);

  // A server error sends the shopper back to the step it belongs to.
  useEffect(() => {
    if (state.error) {
      setStep(state.step ?? 6);
      setReached(6);
      requestAnimationFrame(() => top.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    }
  }, [state]);

  const z: Zone = zones.find((x) => x.id === zone) ?? zones[0] ?? { id: "", group: "", title: "No delivery option", note: "", fee: 0, freeOver: false, needsAddress: true };
  const priceOf = (x: Zone) => (x.fee > 0 && x.freeOver && freeOver > 0 && subtotal - discount >= freeOver ? 0 : x.fee);
  const fee = priceOf(z);
  const fmt = (n: number) => "KES " + n.toLocaleString("en-KE");
  const groups = zones.reduce<{ name: string; items: Zone[] }[]>((acc, x) => {
    const g = acc.find((a) => a.name === x.group);
    if (g) g.items.push(x); else acc.push({ name: x.group, items: [x] });
    return acc;
  }, []);

  /** Check the fields of the current step, then open the next one. */
  const next = (from: number) => {
    const panel = formRef.current?.querySelector<HTMLElement>(`[data-step="${from}"]`);
    if (panel) {
      for (const el of panel.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>("input, select, textarea")) {
        if (!el.checkValidity()) { el.reportValidity(); return; }
      }
      if (from === 2 && account === "register") {
        const pw = panel.querySelector<HTMLInputElement>('[name="password"]');
        const cf = panel.querySelector<HTMLInputElement>('[name="confirm"]');
        if (pw && cf && pw.value !== cf.value) { cf.setCustomValidity("Passwords don't match"); cf.reportValidity(); cf.setCustomValidity(""); return; }
      }
    }
    if (formRef.current) setSnap(Object.fromEntries([...new FormData(formRef.current).entries()].filter(([, v]) => typeof v === "string")) as Record<string, string>);
    setStep(from + 1);
    setReached((r) => Math.max(r, from + 1));
    requestAnimationFrame(() => top.current?.querySelector(`[aria-current="step"]`)?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };
  const edit = (n: number) => setStep(n);
  const done = (n: number) => reached > n;
  const nextBtn = (n: number, label = "Continue") => (
    <div className="mt-6 flex justify-end"><button type="button" onClick={() => next(n)} className={primaryBtn}>{label}</button></div>
  );

  const bill = (k: string) => snap[k] ?? "";
  const billName = `${bill("firstName")} ${bill("lastName")}`.trim();
  const billAddr = [bill("address1"), bill("address2"), bill("city"), bill("county")].filter(Boolean).join(", ");
  const shipAddr = shipDifferent ? [`${bill("shipFirstName")} ${bill("shipLastName")}`.trim(), bill("shipAddress1"), bill("shipAddress2"), bill("shipCity"), bill("shipCounty")].filter(Boolean).join(", ") : billAddr;
  const payLabel = noPayment ? "Pay later (we'll call you)" : PAY.find((p) => p.id === pay)?.label ?? "Pay later";
  const v = (k: string, d?: string) => f[k] ?? d;

  return (
    <div className="grid grid-cols-12 gap-6">
      <div ref={top} className="col-span-12 flex flex-col gap-y-4 xl:col-span-8">
        {state.error && <p className="rounded-2xl border border-[#ffc8c5] bg-red-50 px-4 py-3 text-sm font-medium text-sale md:px-6" role="alert">{state.error}</p>}
        {/* Step 1 sits outside the order form because it holds its own login form. */}
        <Step n={1} title="Checkout Options" current={step === 1} done={done(1) || !!signedIn} onEdit={signedIn ? undefined : () => edit(1)}
          summary={signedIn ? <>Signed in as <b className="text-ink">{signedIn.name}</b> ({signedIn.email})</> : account === "guest" ? "Guest Checkout" : "Register Account"}>
          <div className="grid gap-8 md:grid-cols-2">
            <div>
              <h6 className="text-base font-semibold text-ink">New Customer</h6>
              <p className="mb-4 text-sm text-muted">Checkout Options:</p>
              <div className="grid gap-4">
                <label className={option}><Choice name="account" value="register" form="checkout-form" checked={account === "register"} onChange={() => setAccount("register")} /> Register Account</label>
                <label className={option}><Choice name="account" value="guest" form="checkout-form" checked={account === "guest"} onChange={() => setAccount("guest")} /> Guest Checkout</label>
              </div>
              <p className="mt-4 text-sm text-muted">By creating an account you will be able to shop faster, be up to date on an order&apos;s status, and keep track of the orders you have previously made.</p>
              <div className="mt-6"><button type="button" onClick={() => next(1)} className={primaryBtn}>Continue</button></div>
            </div>
            <div className="border-t border-line pt-6 md:border-l md:border-t-0 md:pl-8 md:pt-0"><LoginBox /></div>
          </div>
        </Step>

        <form ref={formRef} id="checkout-form" action={action} className="flex flex-col gap-y-4" noValidate={false}>
          {signedIn && <input type="hidden" name="account" value="member" />}

          <div data-step="2">
            <Step n={2} title={account === "register" && !signedIn ? "Account & Billing Details" : "Billing Details"} current={step === 2} done={done(2)} onEdit={() => edit(2)}
              summary={<>{billName}{bill("phone") && ` · ${bill("phone")}`}{bill("email") && ` · ${bill("email")}`}<br />{billAddr}</>}>
              <h6 className="mb-4 text-base font-semibold text-ink">Your Personal Details</h6>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="First Name" name="firstName" required autoComplete="given-name" maxLength={60} defaultValue={v("firstName", defaults.firstName)} />
                <Field label="Last Name" name="lastName" required autoComplete="family-name" maxLength={60} defaultValue={v("lastName", defaults.lastName)} />
                <Field label="E-Mail" name="email" type="email" required autoComplete="email" defaultValue={v("email", defaults.email)} readOnly={!!signedIn} />
                <Field label="Telephone (M-Pesa number)" name="phone" type="tel" inputMode="tel" required autoComplete="tel" pattern="^\+?[0-9 ]{9,15}$" title="e.g. 0712 345 678" defaultValue={v("phone", defaults.phone)} />
              </div>
              {account === "register" && !signedIn && (
                <>
                  <h6 className="mb-4 mt-6 text-base font-semibold text-ink">Your Password</h6>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Password (8+ characters)" name="password" type="password" required minLength={8} autoComplete="new-password" />
                    <Field label="Password Confirm" name="confirm" type="password" required minLength={8} autoComplete="new-password" />
                  </div>
                </>
              )}
              <h6 className="mb-4 mt-6 text-base font-semibold text-ink">Your Address</h6>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Company (optional)" name="company" autoComplete="organization" maxLength={80} defaultValue={v("company")} className="sm:col-span-2" />
                <Field label="Address 1" name="address1" required autoComplete="address-line1" maxLength={200} defaultValue={v("address1", defaults.address1)} />
                <Field label="Address 2 (optional)" name="address2" autoComplete="address-line2" maxLength={120} defaultValue={v("address2", defaults.address2)} />
                <Field label="City / Town" name="city" required autoComplete="address-level2" maxLength={80} defaultValue={v("city", defaults.city)} />
                <Field label="Post Code (optional)" name="postcode" autoComplete="postal-code" maxLength={10} defaultValue={v("postcode")} />
                <FieldSelect label="County" name="county" required defaultValue={v("county", defaults.county ?? "Nairobi")}>
                  {COUNTIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </FieldSelect>
                <Field label="Country" name="country" value="Kenya" readOnly tabIndex={-1} />
              </div>
              {nextBtn(2)}
            </Step>
          </div>

          <div data-step="3">
            <Step n={3} title="Delivery Details" current={step === 3} done={done(3)} onEdit={() => edit(3)} summary={shipDifferent ? shipAddr : "Same as billing address"}>
              <label className={option}>
                <Choice type="checkbox" checked={!shipDifferent} onChange={(e) => setShipDifferent(!e.target.checked)} />
                My delivery and billing addresses are the same.
              </label>
              <input type="hidden" name="shipDifferent" value={shipDifferent ? "1" : "0"} />
              {shipDifferent && (
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <Field label="First Name" name="shipFirstName" required maxLength={60} defaultValue={v("shipFirstName")} />
                  <Field label="Last Name" name="shipLastName" required maxLength={60} defaultValue={v("shipLastName")} />
                  <Field label="Company (optional)" name="shipCompany" maxLength={80} defaultValue={v("shipCompany")} className="sm:col-span-2" />
                  <Field label="Address 1" name="shipAddress1" required maxLength={200} defaultValue={v("shipAddress1")} />
                  <Field label="Address 2 (optional)" name="shipAddress2" maxLength={120} defaultValue={v("shipAddress2")} />
                  <Field label="City / Town" name="shipCity" required maxLength={80} defaultValue={v("shipCity")} />
                  <Field label="Post Code (optional)" name="shipPostcode" maxLength={10} defaultValue={v("shipPostcode")} />
                  <FieldSelect label="County" name="shipCounty" required defaultValue={v("shipCounty", "Nairobi")}>
                    {COUNTIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </FieldSelect>
                </div>
              )}
              {nextBtn(3)}
            </Step>
          </div>

          <div data-step="4">
            <Step n={4} title="Delivery Method" current={step === 4} done={done(4)} onEdit={() => edit(4)} summary={`${z.title} · ${fee === 0 ? (z.fee === 0 ? fmt(0) : "Free") : fmt(fee)}`}>
              <p className="mb-4 text-sm text-muted">Please select the preferred shipping method to use on this order.</p>
              {zones.length === 0 && <p className="rounded-xl bg-accent-soft p-3 text-sm">Delivery isn&apos;t available online right now. Please call us to complete your order.</p>}
              <div className="grid gap-5">
                {groups.map((g) => (
                  <div key={g.name}>
                    <p className="mb-2 font-semibold text-ink">{g.name}</p>
                    <div className="grid gap-3">
                      {g.items.map((x) => (
                        <label key={x.id} className={option}>
                          <Choice name="zone" value={x.id} required checked={zone === x.id} onChange={() => setZone(x.id)} />
                          <span className="flex-1">{x.title} - {priceOf(x) === 0 && x.fee > 0 ? "Free" : fmt(priceOf(x))}{x.note && <span className="text-sm text-muted"> · {x.note}</span>}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <p className="mb-3 mt-6 font-semibold text-ink">Add Comments About Your Order</p>
              <FieldArea label="Comments (optional)" name="notes" rows={3} maxLength={500} defaultValue={v("notes")} />
              {nextBtn(4)}
            </Step>
          </div>

          <div data-step="5">
            <Step n={5} title="Payment Method" current={step === 5} done={done(5)} onEdit={() => edit(5)} summary={`${payLabel}${hasRx ? " · prescription attached" : ""}`}>
              {noPayment && <p className="mb-4 rounded-xl bg-accent-soft p-3 text-sm">Online payment is temporarily unavailable. You can still place your order and we&apos;ll call you to arrange payment.</p>}
              {!noPayment && <p className="mb-4 text-sm text-muted">Please select the preferred payment method to use on this order.</p>}
              {hasRx && <p className="mb-4 rounded-xl bg-accent-soft p-3 text-sm">You&apos;ll pay after our pharmacist approves your prescription.</p>}
              <div className="flex flex-col gap-y-4">
                {PAY.filter((m) => payMethods[m.id]).map((m) => (
                  <label key={m.id} className={`block w-full cursor-pointer rounded-[20px] border px-3 py-4 transition-colors ${pay === m.id ? "border-brand-600 bg-[#f9fafb]" : "border-line"}`}>
                    <span className="flex items-center gap-3 pl-1">
                      <Choice name="payMethod" value={m.id} checked={pay === m.id} onChange={() => setPay(m.id)} />
                      <span className="flex-1 text-base font-semibold text-ink">{m.label}</span>
                      {m.badge}
                    </span>
                    <span className={`grid transition-[grid-template-rows] duration-300 ${pay === m.id ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                      <span className="overflow-hidden"><span className="block pl-10 pt-4 text-sm text-muted">{m.text}</span></span>
                    </span>
                  </label>
                ))}
              </div>
              {hasRx && (
                <div className="mt-6">
                  <p className="mb-2 font-semibold text-ink">Prescription</p>
                  <p className="mb-3 text-sm text-muted">Your order contains prescription-only medicine. Upload a clear photo or PDF of a valid prescription.</p>
                  <input type="file" name="prescription" required accept="application/pdf,image/jpeg,image/png,image/webp" className="w-full rounded-full border border-dashed border-brand-600 px-4 py-3 text-sm file:mr-3 file:rounded-full file:border-0 file:bg-brand-50 file:px-4 file:py-2 file:text-brand-700" />
                </div>
              )}
              <label className={`${option} mt-6`}>
                <Choice type="checkbox" name="agree" value="1" required defaultChecked={f.agree === "1"} />
                <span>I have read and agree to the <Link href="/terms" target="_blank" className="font-semibold text-brand-600 underline">Terms &amp; Conditions</Link></span>
              </label>
              {nextBtn(5)}
            </Step>
          </div>

          <div data-step="6">
            <Step n={6} title="Confirm Order" current={step === 6} done={false}>
              <div className="overflow-x-auto rounded-xl border border-line">
                <table className="w-full min-w-[480px] text-left text-sm">
                  <thead className="bg-well"><tr className="h-11"><th className="pl-4 font-semibold">Product Name</th><th className="px-3 text-center font-semibold">Quantity</th><th className="px-3 text-right font-semibold">Unit Price</th></tr></thead>
                  <tbody>
                    {lines.map((l) => (
                      <tr key={l.id} className="border-t border-line">
                        <td className="py-3 pl-4 font-medium text-ink">{l.name}{l.rx && <span className="ml-2 text-xs text-muted">(Prescription)</span>}</td>
                        <td className="px-3 text-center">{l.qty}</td>
                        <td className="px-3 text-right">{l.unit}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t border-line text-right">
                    <tr><td colSpan={2} className="py-2 pr-3 text-muted">Sub-Total:</td><td className="px-3 font-semibold">{fmt(subtotal)}</td></tr>
                    {discount > 0 && <tr><td colSpan={2} className="py-2 pr-3 text-muted">Coupon ({couponCode}):</td><td className="px-3 font-semibold text-sale">−{fmt(discount)}</td></tr>}
                    <tr><td colSpan={2} className="py-2 pr-3 text-muted">{z.title}:</td><td className="px-3 font-semibold">{fmt(fee)}</td></tr>
                    <tr className="text-base"><td colSpan={2} className="py-3 pr-3 font-bold">Total:</td><td className="px-3 font-bold">{fmt(subtotal - discount + fee)}</td></tr>
                  </tfoot>
                </table>
              </div>
              <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-3">
                <div><dt className="text-muted">Billing</dt><dd className="mt-1 text-ink">{billName}<br />{billAddr}</dd></div>
                <div><dt className="text-muted">Delivery</dt><dd className="mt-1 text-ink">{z.needsAddress ? shipAddr : z.title}</dd></div>
                <div><dt className="text-muted">Payment</dt><dd className="mt-1 text-ink">{payLabel}</dd></div>
              </dl>
              <div className="mt-6 flex flex-col items-end gap-2">
                <button disabled={pending || zones.length === 0} className={primaryBtn}>
                  {pending ? "Placing order…" : hasRx ? "Confirm & Send for Review" : "Confirm Order"}
                </button>
                <p className="text-xs text-muted">{hasRx ? "You'll pay after your prescription is approved." : "You'll complete payment on the next screen."}</p>
              </div>
            </Step>
          </div>
        </form>
      </div>

      <aside className="col-span-12 h-fit xl:col-span-4 xl:sticky xl:top-5">
        <div className="flex flex-col gap-y-6 rounded-2xl border border-line p-4 md:p-6">
          <h5 className="font-heading text-xl font-bold leading-[30px] text-ink">Cart Items</h5>
          <div className="max-h-[380px] overflow-y-auto rounded-xl border border-line">
            {lines.map((l) => (
              <div key={l.id} className="flex items-center gap-x-3 border-b border-line p-3 last:border-0">
                <span className="relative size-[60px] shrink-0 overflow-hidden rounded-xl bg-[#f4f3f5]">
                  {l.image && <Image src={l.image} alt="" fill sizes="60px" className="object-contain p-1.5 mix-blend-multiply" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-ink" title={l.name}>{l.name}</p>
                  <p className="text-sm text-muted">{l.qty} x {l.rx ? "Prescription" : "Pack"}</p>
                </div>
                <div className="shrink-0 text-right">
                  {l.was && <p className="text-sm text-faint line-through">{l.was}</p>}
                  <p className="font-semibold text-brand-600">{l.unit}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-y-6 rounded-2xl bg-[#f9fafb] px-4 py-6 md:px-6">
            <h5 className="font-heading text-xl font-bold leading-[30px] text-ink">Order Summary</h5>
            {couponSlot}
            <div>
              <div className="flex flex-col gap-y-4 border-b border-line pb-4 text-base">
                <div className="flex justify-between"><span className="text-muted">Sub-Total</span><span className="font-semibold text-ink">{fmt(subtotal)}</span></div>
                {discount > 0 && <div className="flex justify-between"><span className="text-muted">Discount ({couponCode})</span><span className="font-semibold text-sale">−{fmt(discount)}</span></div>}
                <div className="flex justify-between gap-3"><span className="text-muted">Shipment <span className="text-sm">({z.title})</span></span><span className="font-semibold text-ink">{fee === 0 ? (z.fee === 0 ? fmt(0) : "Free") : fmt(fee)}</span></div>
              </div>
              <div className="flex justify-between pt-4">
                <h6 className="text-lg font-bold text-ink">Total</h6>
                <h6 className="text-lg font-bold text-ink">{fmt(subtotal - discount + fee)}</h6>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
