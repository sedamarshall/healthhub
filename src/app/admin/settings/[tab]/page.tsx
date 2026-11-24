import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { ipayCallbackUrl, ipayConfigured, ipayLive } from "@/lib/ipay";
import { STORE } from "@/lib/config";
import { EMAIL_CATALOGUE, mailFrom, smtpConfigured } from "@/lib/mail";
import { kes } from "@/lib/utils";
import { sendTestEmail, testSmtpConnection } from "../../actions-more";
import { changeMyPassword, deleteShippingMethod, moveShippingMethod, saveSettingsForm, saveShippingMethod, toggleShippingMethod } from "../../actions-more";
import { Actions, DataTable, FInput, FSelect, FTextarea, IconAction, IconLink, ModuleHeader, Section, TabLinks, Toggle } from "../../ui/kit";
import { ActionForm, SaveButtons } from "../../ui/kit-client";

const TABS = [
  { key: "general", label: "General", href: "/admin/settings/general" },
  { key: "shipping", label: "Shipping", href: "/admin/settings/shipping" },
  { key: "seo", label: "SEO", href: "/admin/settings/seo" },
  { key: "payment", label: "Payment API", href: "/admin/settings/payment" },
  { key: "email", label: "Email", href: "/admin/settings/email" },
  { key: "maintenance", label: "Maintains", href: "/admin/settings/maintenance" },
];

export async function generateMetadata({ params }: { params: Promise<{ tab: string }> }) {
  const { tab } = await params;
  const t = TABS.find((x) => x.key === tab);
  return { title: t ? `${t.label} Settings` : "Settings" };
}

function Keys({ keys, toggles = [] }: { keys: string[]; toggles?: string[] }) {
  return (
    <>
      <input type="hidden" name="_keys" value={keys.join(",")} />
      <input type="hidden" name="_toggles" value={toggles.join(",")} />
    </>
  );
}

const dateField = "[&_label]:!top-2 [&_label]:!-translate-y-4 [&_label]:!scale-75 [&_label]:!bg-white [&_label]:!text-[#a10fe4]";

export default async function SettingsPage({ params, searchParams }: { params: Promise<{ tab: string }>; searchParams: Promise<{ edit?: string; preview?: string }> }) {
  await requireStaff(["admin"]);
  const { tab } = await params;
  if (tab === "shop") redirect("/admin/settings/shipping"); // old link
  if (!TABS.some((t) => t.key === tab)) notFound();
  const { edit, preview } = await searchParams;
  const s = await getSettings();

  return (
    <div>
      <ModuleHeader title="Settings" />
      <TabLinks tabs={TABS} active={tab} />

      {tab === "general" && (
        <div className="space-y-6">
          <ActionForm action={saveSettingsForm}>
            <Keys keys={["storeName", "email", "phone", "address", "ppbLicence", "whatsapp", "facebookUrl", "instagramUrl"]} />
            <Section title="Store Information">
              <div className="grid gap-5 sm:grid-cols-2">
                <FInput label="Store name" name="storeName" defaultValue={s.storeName} required />
                <FInput label="Email Address" name="email" type="email" defaultValue={s.email} required />
                <FInput label="Phone number (shown in header & footer)" name="phone" defaultValue={s.phone} required />
                <FInput label="Address / City" name="address" defaultValue={s.address} />
                <FInput label="Pharmacy & Poisons Board licence no." name="ppbLicence" defaultValue={s.ppbLicence} />
                <FInput label="WhatsApp number" name="whatsapp" defaultValue={s.whatsapp} />
                <FInput label="Facebook page link" name="facebookUrl" type="url" defaultValue={s.facebookUrl} />
                <FInput label="Instagram link" name="instagramUrl" type="url" defaultValue={s.instagramUrl} />
              </div>
            </Section>
            <SaveButtons saveLabel="Save Changes" />
          </ActionForm>
          <ActionForm action={changeMyPassword}>
            <Section title="Password">
              <div className="grid gap-5 sm:grid-cols-3">
                <FInput label="Old Password" name="oldPassword" type="password" autoComplete="current-password" />
                <FInput label="New Password" name="newPassword" type="password" autoComplete="new-password" />
                <FInput label="Confirm Password" name="confirmPassword" type="password" autoComplete="new-password" />
              </div>
            </Section>
            <SaveButtons saveLabel="Change password" />
          </ActionForm>
        </div>
      )}

      {tab === "shipping" && <ShippingTab freeOver={s.freeDeliveryOver} edit={Number(edit) || 0} />}

      {tab === "email" && <EmailTab storeEmail={s.email} preview={EMAIL_CATALOGUE.some((e) => e.key === preview) ? preview! : "placed"} />}

      {tab === "seo" && (
        <ActionForm action={saveSettingsForm}>
          <Keys keys={["seoTitle", "seoDescription", "googleVerification"]} />
          <Section title="SEO Settings">
            <div className="grid gap-5">
              <FInput label="Home page title" name="seoTitle" defaultValue={s.seoTitle} maxLength={70} required />
              <FTextarea label="Home page meta description" name="seoDescription" rows={3} defaultValue={s.seoDescription} maxLength={160} required />
              <FInput label="Google Search Console verification code" name="googleVerification" defaultValue={s.googleVerification} />
            </div>
            <p className="mt-4 text-xs text-[#919eab]">Sitemap: {STORE.appUrl}/sitemap.xml. Submit it in Google Search Console after launch.</p>
          </Section>
          <SaveButtons saveLabel="Save Changes" />
        </ActionForm>
      )}

      {tab === "payment" && (
        <ActionForm action={saveSettingsForm}>
          <Keys keys={[]} toggles={["ipayEnabled"]} />
          <Section title="Payment API Settings">
            <div className="grid gap-5 md:grid-cols-2">
              <PaymentCard
                logo={<span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#a10fe4] text-[10px] font-black text-white">iPay</span>}
                name="iPay Africa"
                toggle="ipayEnabled"
                enabled={s.ipayEnabled === "1"}
                rows={[
                  ["Channels", "M-Pesa, Airtel Money, Visa / Mastercard"],
                  ["Vendor ID", process.env.IPAY_VENDOR_ID || "Not set"],
                  ["Hash key", process.env.IPAY_HASH_KEY ? "Configured" : "Not set"],
                  ["Mode", ipayLive() ? "Live" : "Test"],
                  ["Callback URL", ipayCallbackUrl()],
                ]}
                ready={ipayConfigured()}
              />
            </div>
            <p className="mt-4 text-xs text-[#919eab]">Keys are kept in the server&apos;s .env file (IPAY_VENDOR_ID, IPAY_HASH_KEY, IPAY_LIVE), never in the database. Without keys, development uses a test page instead of iPay.</p>
          </Section>
          <SaveButtons saveLabel="Save Changes" />
        </ActionForm>
      )}

      {tab === "maintenance" && (
        <ActionForm action={saveSettingsForm}>
          <Keys keys={["maintenanceMessage", "maintenanceUntil"]} toggles={["maintenance"]} />
          <Section title="Maintenance Mode">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="rounded-2xl border border-[rgba(145,158,171,0.2)] p-4 sm:col-span-2">
                <Toggle name="maintenance" defaultChecked={s.maintenance === "1"} label="Maintenance Mode" hint="Customers see a 'we'll be back soon' page. Staff who are signed in can still use the shop and admin." />
              </div>
              <FInput label="Auto Reopen (shown to customers)" name="maintenanceUntil" type="datetime-local" defaultValue={s.maintenanceUntil} className={dateField} />
              <FTextarea label="Maintenance Message" name="maintenanceMessage" rows={4} defaultValue={s.maintenanceMessage} className="sm:col-span-2" />
            </div>
          </Section>
          <SaveButtons saveLabel="Save Change" />
        </ActionForm>
      )}
    </div>
  );
}

function PaymentCard({ logo, name, toggle, enabled, rows, ready }: { logo: React.ReactNode; name: string; toggle: string; enabled: boolean; rows: [string, string][]; ready: boolean }) {
  return (
    <div className="rounded-2xl border border-[rgba(145,158,171,0.2)] p-4">
      <div className="flex items-center gap-3">
        {logo}
        <div className="flex-1">
          <p className="text-sm font-semibold">{name}</p>
          <p className="text-xs text-[#495057]">Online payment processing</p>
        </div>
        <Toggle name={toggle} defaultChecked={enabled} />
      </div>
      <dl className="mt-4 space-y-2">
        {rows.map(([k, v]) => (
          <div key={k} className="flex h-11 items-center justify-between rounded-full border border-[rgba(145,158,171,0.2)] px-4 text-sm">
            <dt className="text-[#919eab]">{k}</dt>
            <dd className={`max-w-[60%] truncate ${v === "Not set" ? "text-[#cb0233]" : "text-[#212529]"}`} title={v}>{v}</dd>
          </div>
        ))}
      </dl>
      <p className={`mt-3 text-xs font-semibold ${ready ? "text-[#a10fe4]" : "text-[#b78103]"}`}>{ready ? "Live keys configured" : "Keys missing: simulation mode in development, disabled in production"}</p>
    </div>
  );
}

async function ShippingTab({ freeOver, edit }: { freeOver: string; edit: number }) {
  const methods = await prisma.shippingMethod.findMany({ orderBy: [{ position: "asc" }, { id: "asc" }] });
  const editing = edit ? methods.find((m) => m.id === edit) : undefined;
  const arrow = "inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#212529] hover:bg-[#f4f6f8] disabled:opacity-25";
  const yes = (v: boolean) => <span className={v ? "font-semibold text-[#a10fe4]" : "text-[#919eab]"}>{v ? "Yes" : "No"}</span>;

  return (
    <div className="space-y-6">
      <Section title="Delivery Methods">
        <p className="-mt-3 mb-5 text-sm text-[#495057]">These are the options customers choose from at checkout, shown under their group heading in this order.</p>
        <DataTable head={["Order", "Method", "Group", "Fee", "Free over threshold", "Needs address", "Status", "Action"]} empty={!methods.length}>
          {methods.map((m, i) => (
            <tr key={m.id} className={m.isActive ? "" : "opacity-60"}>
              <td>
                <div className="flex">
                  <form action={moveShippingMethod}><input type="hidden" name="id" value={m.id} /><input type="hidden" name="dir" value="up" /><button className={arrow} disabled={i === 0} aria-label={`Move ${m.title} up`}>&uarr;</button></form>
                  <form action={moveShippingMethod}><input type="hidden" name="id" value={m.id} /><input type="hidden" name="dir" value="down" /><button className={arrow} disabled={i === methods.length - 1} aria-label={`Move ${m.title} down`}>&darr;</button></form>
                </div>
              </td>
              <td><p className="font-semibold">{m.title}</p>{m.note && <p className="text-xs text-[#919eab]">{m.note}</p>}</td>
              <td>{m.group}</td>
              <td className="whitespace-nowrap font-semibold">{kes(m.fee)}</td>
              <td>{yes(m.freeOver)}</td>
              <td>{yes(m.needsAddress)}</td>
              <td>
                <form action={toggleShippingMethod}>
                  <input type="hidden" name="id" value={m.id} />
                  <button className={`rounded-md px-2 py-1 text-xs font-bold ${m.isActive ? "bg-[rgba(161,15,228,0.12)] text-[#850cbd]" : "bg-[rgba(145,158,171,0.16)] text-[#637381]"}`} title="Click to switch on or off">
                    {m.isActive ? "Active" : "Off"}
                  </button>
                </form>
              </td>
              <td>
                <Actions>
                  <IconLink href={`/admin/settings/shipping?edit=${m.id}#method-form`} kind="edit" label={`Edit ${m.title}`} />
                  <IconAction action={deleteShippingMethod} kind="delete" label={`Delete ${m.title}`} fields={{ id: m.id }} confirm={`Delete "${m.title}"? Past orders keep their delivery details.`} />
                </Actions>
              </td>
            </tr>
          ))}
        </DataTable>
        {methods.length > 0 && !methods.some((m) => m.isActive) && <p className="mt-4 text-sm font-semibold text-[#cb0233]">All methods are switched off, so customers can&apos;t check out. Switch at least one on.</p>}
      </Section>

      <div id="method-form">
        <ActionForm action={saveShippingMethod} key={editing?.id ?? "new"}>
          {editing && <input type="hidden" name="id" value={editing.id} />}
          <Section title={editing ? `Edit "${editing.title}"` : "Add Delivery Method"}>
            <div className="grid gap-5 sm:grid-cols-2">
              <FInput label="Group heading (e.g. Flat Rate, Pickup)" name="group" defaultValue={editing?.group} required maxLength={60} />
              <FInput label="Method name (e.g. Flat Shipping Rate)" name="title" defaultValue={editing?.title} required maxLength={80} />
              <FInput label="Fee (KES, 0 for free)" name="fee" type="number" min={0} step={1} defaultValue={editing?.fee ?? 0} required />
              <FInput label="Short note (optional, e.g. 1-3 days)" name="note" defaultValue={editing?.note} maxLength={120} />
              <FInput label="Sort order (optional)" name="position" type="number" min={0} defaultValue={editing?.position} />
              <div className="grid gap-4 rounded-2xl border border-[rgba(145,158,171,0.2)] p-4 sm:col-span-2 md:grid-cols-3">
                <Toggle name="needsAddress" defaultChecked={editing?.needsAddress ?? true} label="Needs a delivery address" hint="Turn off for store pickup" />
                <Toggle name="freeOver" defaultChecked={editing?.freeOver ?? true} label="Free over threshold" hint={`Free when the order reaches ${kes(Number(freeOver))}`} />
                <Toggle name="isActive" defaultChecked={editing?.isActive ?? true} label="Active" hint="Show at checkout" />
              </div>
            </div>
          </Section>
          <SaveButtons cancel={editing ? "/admin/settings/shipping" : undefined} saveLabel={editing ? "Save Changes" : "Add Method"} />
        </ActionForm>
      </div>

      <ActionForm action={saveSettingsForm}>
        <Keys keys={["freeDeliveryOver"]} />
        <Section title="Free Delivery">
          <FInput label="Free delivery on orders over (KES, 0 to switch off)" name="freeDeliveryOver" type="number" min={0} defaultValue={freeOver} required className="max-w-md" />
          <p className="mt-3 text-xs text-[#919eab]">Applies to methods with &ldquo;Free over threshold&rdquo; on. Also shown in the shop&apos;s top bar.</p>
        </Section>
        <SaveButtons saveLabel="Save Changes" />
      </ActionForm>
    </div>
  );
}

function EmailTab({ storeEmail, preview }: { storeEmail: string; preview: string }) {
  const ready = smtpConfigured();
  const groups = ["Customer: orders", "Customer: account", "Store owner"] as const;
  const current = EMAIL_CATALOGUE.find((e) => e.key === preview)!;
  const row = (k: string, v: string, warn = false) => (
    <div className="flex h-11 items-center justify-between rounded-full border border-[rgba(145,158,171,0.2)] px-4 text-sm">
      <dt className="text-[#919eab]">{k}</dt>
      <dd className={`max-w-[65%] truncate ${warn ? "text-[#cb0233]" : "text-[#212529]"}`} title={v}>{v}</dd>
    </div>
  );
  return (
    <div className="space-y-6">
      <Section title="Outgoing Email (SMTP)">
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <dl className="space-y-2">
              {row("Server", process.env.SMTP_HOST ? `${process.env.SMTP_HOST}:${process.env.SMTP_PORT || 587}` : "Not set", !process.env.SMTP_HOST)}
              {row("Username", process.env.SMTP_USER || "Not set", !process.env.SMTP_USER)}
              {row("Password", process.env.SMTP_PASS ? "Configured" : "Not set", !process.env.SMTP_PASS)}
              {row("Sends from", mailFrom() || "Not set", !mailFrom())}
              {row("Store alerts go to", storeEmail)}
            </dl>
            <p className={`mt-3 text-xs font-semibold ${ready ? "text-[#a10fe4]" : "text-[#b78103]"}`}>
              {ready ? "SMTP is set up. Emails are being sent." : "SMTP isn't set up yet: emails are only written to the server log, nothing reaches customers."}
            </p>
            <ActionForm action={testSmtpConnection} className="mt-4 space-y-3">
              <button className="inline-flex h-9 items-center rounded-full px-4 text-sm font-bold shadow-[0_0_0_1px_rgba(145,158,171,0.32)] hover:bg-[#f9fafb]">Test connection</button>
            </ActionForm>
          </div>
          <div className="rounded-2xl bg-[#f9fafb] p-4 text-sm text-[#495057]">
            <p className="font-semibold text-[#212529]">How to connect your SMTP</p>
            <p className="mt-1">Add these lines to the server&apos;s <code>.env</code> file, then restart the site:</p>
            <pre className="mt-3 overflow-x-auto rounded-xl bg-white p-3 text-xs leading-5 text-[#212529]">{`SMTP_HOST="smtp.yourprovider.com"
SMTP_PORT="587"
SMTP_USER="orders@healthhub.ke"
SMTP_PASS="your-smtp-password"
MAIL_FROM="Health Hub Chemist <orders@healthhub.ke>"`}</pre>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-xs">
              <li>Google Workspace: smtp.gmail.com, port 587, use an <b>app password</b>.</li>
              <li>Zoho Mail: smtp.zoho.com, port 465.</li>
              <li>Brevo / Mailgun / SendGrid: use the SMTP details from their dashboard.</li>
              <li>Port 465 uses SSL; 587 uses STARTTLS. Both work.</li>
              <li>For best delivery, use an address on your own domain and set up SPF/DKIM with your provider.</li>
            </ul>
          </div>
        </div>
      </Section>

      <ActionForm action={sendTestEmail}>
        <Section title="Send a Test Email">
          <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-center sm:gap-6">
            <FSelect label="Template" name="template" defaultValue={preview}>
              {EMAIL_CATALOGUE.map((e) => <option key={e.key} value={e.key}>{e.group.replace("Customer: ", "")} · {e.label}</option>)}
            </FSelect>
            <FInput label="Send to" name="to" type="email" required defaultValue={storeEmail} />
            <SaveButtons saveLabel="Send test" />
          </div>
          <p className="mt-3 text-xs text-[#919eab]">The test uses sample order details and has &ldquo;[TEST]&rdquo; in the subject.</p>
        </Section>
      </ActionForm>

      <Section title="Email Templates">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,380px)_1fr]">
          <div className="space-y-5">
            {groups.map((g) => (
              <div key={g}>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[#919eab]">{g}</p>
                <ul className="space-y-1">
                  {EMAIL_CATALOGUE.filter((e) => e.group === g).map((e) => (
                    <li key={e.key}>
                      <a href={`/admin/settings/email?preview=${e.key}#preview`} className={`block rounded-xl px-3 py-2.5 text-sm transition-colors ${e.key === preview ? "bg-[rgba(161,15,228,0.08)] text-[#850cbd]" : "hover:bg-[#f9fafb]"}`}>
                        <span className="block font-semibold">{e.label}</span>
                        <span className="block text-xs text-[#919eab]">Sent when: {e.when}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div id="preview" className="overflow-hidden rounded-2xl border border-[rgba(145,158,171,0.2)]">
            <p className="border-b border-[rgba(145,158,171,0.2)] bg-[#f9fafb] px-4 py-3 text-sm"><b>Preview:</b> {current.label} <span className="text-[#919eab]">(sample order)</span></p>
            <iframe src={`/admin/email-preview/${preview}`} title={`Preview of ${current.label}`} className="h-[760px] w-full bg-[#f4f6f8]" />
          </div>
        </div>
      </Section>
    </div>
  );
}
