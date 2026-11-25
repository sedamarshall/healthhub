import "server-only";
import nodemailer from "nodemailer";
import { STORE } from "./config";
import { getSettings, type Settings } from "./settings";
import { kes } from "./utils";

/**
 * Transactional email over SMTP (any provider: Google Workspace, Zoho, Brevo, Mailgun, SendGrid...).
 * Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS and MAIL_FROM in .env. Without them, emails are
 * written to the server log instead, so nothing breaks. Admin → Settings → Email previews every
 * template and sends test emails.
 */
export const smtpConfigured = () => !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
export const mailFrom = () => process.env.MAIL_FROM || process.env.SMTP_USER || "";

let transport: nodemailer.Transporter | null = null;
function getTransport() {
  if (!transport) {
    const port = Number(process.env.SMTP_PORT || 587);
    transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465, // 465 = SSL; 587/25 = STARTTLS
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return transport;
}

/** Checks the SMTP login without sending anything. */
export async function verifySmtp(): Promise<{ ok: boolean; message: string }> {
  if (!smtpConfigured()) return { ok: false, message: "SMTP isn't set up yet. Add SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS and MAIL_FROM to .env and restart." };
  try {
    await getTransport().verify();
    return { ok: true, message: `Connected to ${process.env.SMTP_HOST} as ${process.env.SMTP_USER}.` };
  } catch (e) {
    return { ok: false, message: `SMTP login failed: ${e instanceof Error ? e.message : String(e)}` };
  }
}

// ---------------------------------------------------------------- building blocks

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const P = (html: string) => `<p style="margin:0 0 14px;font-size:15px;line-height:24px;color:#212529">${html}</p>`;
const button = (href: string, label: string) =>
  `<table cellpadding="0" cellspacing="0" style="margin:22px 0"><tr><td style="background:#a10fe4;border-radius:999px"><a href="${href}" style="display:inline-block;padding:13px 26px;color:#ffffff;font-size:15px;font-weight:bold;text-decoration:none">${esc(label)}</a></td></tr></table>`;
const pill = (label: string, bg: string, fg: string) => `<span style="display:inline-block;padding:4px 12px;border-radius:999px;background:${bg};color:${fg};font-size:13px;font-weight:bold">${esc(label)}</span>`;

async function layout(s: Settings, title: string, preheader: string, bodyHtml: string) {
  const logo = `${STORE.appUrl}/brand/logo.png`;
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title></head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:Arial,Helvetica,sans-serif;color:#212529">
<span style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;padding:24px 12px"><tr><td align="center">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden">
    <tr><td style="height:6px;background:#a10fe4"></td></tr>
    <tr><td style="padding:24px 28px 8px"><a href="${STORE.appUrl}"><img src="${logo}" width="140" height="40" alt="${esc(s.storeName)}" style="display:block;border:0"></a></td></tr>
    <tr><td style="padding:12px 28px 28px">
      <h1 style="margin:0 0 18px;font-size:22px;line-height:30px;color:#212529">${esc(title)}</h1>
      ${bodyHtml}
    </td></tr>
    <tr><td style="padding:20px 28px;background:#f9fafb;color:#637381;font-size:12px;line-height:20px">
      <b style="color:#212529">${esc(s.storeName)}</b><br>
      ${esc(s.address)}<br>
      Call / WhatsApp ${esc(s.phone)} · <a href="mailto:${esc(s.email)}" style="color:#a10fe4">${esc(s.email)}</a>
      ${s.ppbLicence ? `<br>Pharmacy &amp; Poisons Board licence ${esc(s.ppbLicence)}` : ""}
    </td></tr>
  </table>
</td></tr></table></body></html>`;
}

/** Plain-text twin of the HTML (some inboxes and spam filters prefer it). */
const toText = (html: string) =>
  html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|tr|h1|h2|li)>/gi, "\n")
    .replace(/<a [^>]*href="([^"]+)"[^>]*>([^<]*)<\/a>/gi, "$2: $1")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n\s*\n+/g, "\n\n")
    .trim();

// ---------------------------------------------------------------- orders

export type OrderLike = {
  number: string; accessToken: string; name: string; email: string; phone: string;
  county: string; town: string; address: string; deliveryZone: string; deliveryFee: number;
  subtotal: number; discount: number; couponCode: string | null; total: number; status: string; paymentStatus: string;
  notes?: string | null;
  items: { name: string; qty: number; price: number }[];
};

/** Store pickup orders keep the delivery method's name as their address. */
export const isPickup = (o: Pick<OrderLike, "county" | "address" | "deliveryZone">) => o.county === "-" && o.address === o.deliveryZone;
const orderLink = (o: OrderLike) => `${STORE.appUrl}/order/${o.number}?t=${o.accessToken}`;

function orderSummary(o: OrderLike) {
  const row = (l: string, r: string, bold = false) =>
    `<tr><td style="padding:6px 0;font-size:14px;color:${bold ? "#212529" : "#637381"}${bold ? ";font-weight:bold" : ""}">${l}</td><td align="right" style="padding:6px 0;font-size:14px;color:#212529${bold ? ";font-weight:bold" : ""}">${r}</td></tr>`;
  const items = o.items
    .map((i) => `<tr><td style="padding:10px 0;border-bottom:1px solid #eef0f2;font-size:14px">${esc(i.name)} <span style="color:#637381">× ${i.qty}</span></td><td align="right" style="padding:10px 0;border-bottom:1px solid #eef0f2;font-size:14px;white-space:nowrap">${kes(i.price * i.qty)}</td></tr>`)
    .join("");
  const where = isPickup(o) ? `${esc(o.deliveryZone)}` : `${esc(o.address)}${o.town ? `, ${esc(o.town)}` : ""}${o.county && o.county !== "-" ? `, ${esc(o.county)}` : ""}<br><span style="color:#637381">${esc(o.deliveryZone)}</span>`;
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0;border:1px solid #eef0f2;border-radius:12px">
    <tr><td style="padding:14px 18px;background:#f9fafb;border-radius:12px 12px 0 0;font-size:14px"><b>Order #${esc(o.number)}</b></td></tr>
    <tr><td style="padding:4px 18px 14px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${items}
        ${row("Sub-total", kes(o.subtotal))}
        ${o.discount > 0 ? row(`Discount${o.couponCode ? ` (${esc(o.couponCode)})` : ""}`, `−${kes(o.discount)}`) : ""}
        ${row("Delivery", o.deliveryFee ? kes(o.deliveryFee) : "Free")}
        ${row("Total", kes(o.total), true)}
      </table>
    </td></tr>
    <tr><td style="padding:14px 18px;border-top:1px solid #eef0f2;font-size:14px;line-height:22px">
      <b>${isPickup(o) ? "Collection" : "Delivery to"}</b><br>${esc(o.name)} · 0${esc(o.phone.slice(3))}<br>${where}
    </td></tr>
  </table>`;
}

export type OrderEmailKind =
  | "placed" | "rx_pending" | "rx_approved" | "rx_rejected" | "paid" | "payment_failed"
  | "shipped" | "delivered" | "cancelled" | "refunded";

/** Customer-facing order emails: subject, title, preheader and body for each event. */
function orderTemplate(kind: OrderEmailKind, o: OrderLike, extra: { note?: string; amount?: number } = {}) {
  const first = esc(o.name.split(" ")[0]);
  const pickup = isPickup(o);
  const T: Record<OrderEmailKind, { subject: string; title: string; pre: string; body: string }> = {
    placed: {
      subject: `Order #${o.number} received: complete your payment`,
      title: "Thanks for your order!",
      pre: `We've received order #${o.number}. Pay ${kes(o.total)} to confirm it.`,
      body: P(`Hi ${first}, we've received your order. ${pill("Awaiting payment", "#fff5cc", "#b78103")}`) + P("Complete payment with M-Pesa, Airtel Money or card and we'll start preparing it right away.") + button(orderLink(o), "Pay now") + orderSummary(o),
    },
    rx_pending: {
      subject: `Order #${o.number}: we're checking your prescription`,
      title: "We're checking your prescription",
      pre: "Our pharmacist is reviewing your prescription.",
      body: P(`Hi ${first}, thanks for your order. ${pill("Awaiting pharmacist review", "#efd6fc", "#850cbd")}`) + P("Our pharmacist is reviewing your prescription, usually within an hour during opening times. We'll email you as soon as it's approved so you can pay.") + button(orderLink(o), "View your order") + orderSummary(o),
    },
    rx_approved: {
      subject: `Order #${o.number}: prescription approved, ready to pay`,
      title: "Your prescription is approved",
      pre: `Pay ${kes(o.total)} to confirm order #${o.number}.`,
      body: P(`Hi ${first}, good news: our pharmacist has approved your prescription. ${pill("Awaiting payment", "#fff5cc", "#b78103")}`) + P("Pay now and we'll start preparing your order straight away.") + button(orderLink(o), "Pay now") + orderSummary(o),
    },
    rx_rejected: {
      subject: `Order #${o.number}: prescription not approved`,
      title: "We couldn't approve your prescription",
      pre: "Your order has been cancelled.",
      body: P(`Hi ${first}, our pharmacist couldn't approve the prescription for order <b>#${esc(o.number)}</b>, so the order has been cancelled. You have not been charged.`) + (extra.note ? P(`<b>Pharmacist's note:</b> ${esc(extra.note)}`) : "") + P("Please call or WhatsApp us if you have any questions. We're happy to help."),
    },
    paid: {
      subject: `Payment received: order #${o.number} is being processed`,
      title: "Payment received, thank you!",
      pre: `We're preparing order #${o.number}.`,
      body: P(`Hi ${first}, we've received your payment of <b>${kes(o.total)}</b>. ${pill("Processing", "#e3f7f3", "#118d57")}`) + P(pickup ? "We're getting your order ready. We'll email you as soon as it's ready to collect." : "We're preparing your order now and will email you when it's on its way.") + button(orderLink(o), "Track your order") + orderSummary(o),
    },
    payment_failed: {
      subject: `Order #${o.number}: payment didn't go through`,
      title: "Your payment didn't go through",
      pre: "No money was taken. You can try again.",
      body: P(`Hi ${first}, we couldn't complete the payment for order <b>#${esc(o.number)}</b>${extra.note ? ` (${esc(extra.note)})` : ""}. Your order is saved, so you can try again.`) + button(orderLink(o), "Try paying again") + P("If money left your account, don't worry: call us with your M-Pesa or card reference and we'll sort it out."),
    },
    shipped: pickup
      ? {
          subject: `Order #${o.number} is ready to collect`,
          title: "Your order is ready to collect",
          pre: "Come by any time during opening hours.",
          body: P(`Hi ${first}, order <b>#${esc(o.number)}</b> is packed and ready for you. ${pill("Ready for pickup", "#e3f7f3", "#118d57")}`) + P("Bring your order number when you come to collect it.") + button(orderLink(o), "View your order") + orderSummary(o),
        }
      : {
          subject: `Order #${o.number} is on its way`,
          title: "Your order is out for delivery",
          pre: "Keep your phone close: our rider will call you.",
          body: P(`Hi ${first}, order <b>#${esc(o.number)}</b> has left our pharmacy. ${pill("Out for delivery", "#e1efff", "#0c53b7")}`) + P("Please keep your phone close. Our rider will call you on arrival.") + button(orderLink(o), "Track your order") + orderSummary(o),
        },
    delivered: {
      subject: pickup ? `Order #${o.number} collected` : `Order #${o.number} delivered`,
      title: pickup ? "Thanks for collecting your order" : "Your order has been delivered",
      pre: "We hope everything is just right.",
      body: P(`Hi ${first}, order <b>#${esc(o.number)}</b> has been ${pickup ? "collected" : "delivered"}. ${pill(pickup ? "Collected" : "Delivered", "#efd6fc", "#850cbd")}`) + P("We hope everything is just right. If you have a moment, a quick product review helps other customers.") + button(orderLink(o), "Leave feedback"),
    },
    cancelled: {
      subject: `Order #${o.number} cancelled`,
      title: "Your order was cancelled",
      pre: "Here's what happens next.",
      body: P(`Hi ${first}, order <b>#${esc(o.number)}</b> has been cancelled. ${pill("Cancelled", "#ffe9e7", "#b71d18")}`) + (extra.note ? P(esc(extra.note)) : "") + P(o.paymentStatus === "paid" ? "You paid for this order, so we'll refund you. We'll email you when the refund is sent." : "You haven't been charged.") + P("Questions? Call or WhatsApp us any time."),
    },
    refunded: {
      subject: `Refund sent for order #${o.number}`,
      title: "Your refund is on its way",
      pre: `We've refunded ${kes(extra.amount ?? 0)}.`,
      body: P(`Hi ${first}, we've sent a refund of <b>${kes(extra.amount ?? 0)}</b> for order <b>#${esc(o.number)}</b>.`) + (extra.note ? P(`Reference: <b>${esc(extra.note)}</b>`) : "") + P("M-Pesa and Airtel Money refunds usually arrive within minutes; card refunds can take 5 to 10 working days to show on your statement."),
    },
  };
  return T[kind];
}

/** Email to the store owner when an order comes in or is paid. */
function staffTemplate(kind: "new_order" | "payment_received", o: OrderLike) {
  const admin = `${STORE.appUrl}/admin/orders`;
  return kind === "new_order"
    ? { subject: `New order #${o.number} · ${kes(o.total)} · ${o.name}`, title: "New order received", pre: `${o.name} placed order #${o.number}.`, body: P(`<b>${esc(o.name)}</b> (${esc(o.email)}, 0${esc(o.phone.slice(3))}) placed order <b>#${esc(o.number)}</b>.`) + P(o.status === "awaiting_rx" ? "It contains prescription medicine: review the prescription in the admin." : "It's waiting for payment.") + (o.notes ? P(`<b>Customer comment:</b> ${esc(o.notes)}`) : "") + button(admin, "Open in admin") + orderSummary(o) }
    : { subject: `Paid: order #${o.number} · ${kes(o.total)}`, title: "Payment received, ready to process", pre: `Order #${o.number} is paid and moved to Processing.`, body: P(`Order <b>#${esc(o.number)}</b> from <b>${esc(o.name)}</b> is paid and is now <b>Processing</b>. Time to pack it.`) + button(admin, "Open in admin") + orderSummary(o) };
}

// ---------------------------------------------------------------- account & contact

type AccountKind = "welcome" | "password_reset" | "link_orders" | "contact_ack" | "contact_staff";
function accountTemplate(kind: AccountKind, d: { name: string; link?: string; email?: string; phone?: string; subject?: string; body?: string }) {
  const first = esc(d.name.split(" ")[0]);
  switch (kind) {
    case "welcome":
      return { subject: "Welcome to Health Hub Chemist", title: `Welcome, ${first}!`, pre: "Your account is ready.", body: P("Thanks for creating an account. You can now track your orders, save your address for faster checkout and keep a wishlist.") + button(`${STORE.appUrl}/account`, "Go to my account") + P("Need advice on a medicine? Our pharmacists are a call or WhatsApp away.") };
    case "password_reset":
      return { subject: "Reset your Health Hub password", title: "Reset your password", pre: "This link works for 1 hour.", body: P(`Hi ${first}, we received a request to reset your password. This link works for 1 hour.`) + button(d.link ?? STORE.appUrl, "Choose a new password") + P("If you didn't ask for this, you can ignore this email. Your password won't change.") };
    case "link_orders":
      return { subject: "Add your earlier orders to your account", title: "We found your earlier orders", pre: "Confirm it's you to see them in your account.", body: P(`Hi ${first}, we found orders placed with this email address before you created your account.`) + P("To keep your details private, we only add them to your account once you confirm this email is yours. The link works for 7 days.") + button(d.link ?? STORE.appUrl, "Add them to my account") + P("If you didn't create an account with us, you can ignore this email.") };
    case "contact_ack":
      // Deliberately doesn't repeat the message: otherwise anyone could use the form to send their text from our mail server.
      return { subject: "We've received your message", title: "Thanks for getting in touch", pre: "We'll reply as soon as we can.", body: P(`Hi ${first}, we've received your message and a member of our team will reply as soon as we can, usually within one working day.`) + P("For anything urgent, call or WhatsApp us.") };
    case "contact_staff":
      return { subject: `[Website] ${d.subject || `Message from ${d.name}`}`, title: "New message from the website", pre: `${d.name} sent a message.`, body: P(`<b>${esc(d.name)}</b> (${esc(d.email ?? "")}${d.phone ? `, ${esc(d.phone)}` : ""}) wrote:`) + P(esc(d.body ?? "").replace(/\n/g, "<br>")) + button(`${STORE.appUrl}/admin/messages`, "Open inbox") };
  }
}

// ---------------------------------------------------------------- sending

export type Rendered = { subject: string; html: string; text: string };

async function render(t: { subject: string; title: string; pre: string; body: string }): Promise<Rendered> {
  const s = await getSettings();
  const html = await layout(s, t.title, t.pre, t.body);
  return { subject: t.subject, html, text: toText(t.body) + `\n\n${s.storeName} · ${s.phone} · ${s.email}` };
}

export async function sendRendered(to: string, r: Rendered, replyTo?: string): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  if (!smtpConfigured()) {
    console.log(`[mail:not-configured] to=${to} subject="${r.subject}"`);
    return { ok: false, skipped: true };
  }
  try {
    const s = await getSettings();
    await getTransport().sendMail({ from: mailFrom(), to, subject: r.subject, html: r.html, text: r.text, replyTo: replyTo ?? s.email });
    return { ok: true };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    console.error("[mail:error]", error);
    return { ok: false, error };
  }
}

export const renderOrderEmail = (kind: OrderEmailKind, o: OrderLike, extra?: { note?: string; amount?: number }) => render(orderTemplate(kind, o, extra));
export const renderStaffEmail = (kind: "new_order" | "payment_received", o: OrderLike) => render(staffTemplate(kind, o));
export const renderAccountEmail = (kind: AccountKind, d: Parameters<typeof accountTemplate>[1]) => render(accountTemplate(kind, d));

export async function sendOrderEmail(kind: OrderEmailKind, o: OrderLike, extra?: { note?: string; amount?: number }) {
  return sendRendered(o.email, await renderOrderEmail(kind, o, extra));
}
export async function sendStaffEmail(kind: "new_order" | "payment_received", o: OrderLike) {
  const s = await getSettings();
  return sendRendered(s.email, await renderStaffEmail(kind, o), o.email);
}
export async function sendAccountEmail(kind: AccountKind, to: string, d: Parameters<typeof accountTemplate>[1]) {
  return sendRendered(to, await renderAccountEmail(kind, d), kind === "contact_staff" ? d.email : undefined);
}

/** Back-compat for any older caller: a simple branded email. */
export async function sendMail(to: string, subject: string, title: string, bodyHtml: string) {
  return sendRendered(to, await render({ subject, title, pre: title, body: bodyHtml }));
}

/** Every email the shop sends, for Admin → Settings → Email (preview + test send). */
export const EMAIL_CATALOGUE: { key: string; group: "Customer: orders" | "Customer: account" | "Store owner"; label: string; when: string }[] = [
  { key: "placed", group: "Customer: orders", label: "Order received (awaiting payment)", when: "Customer places an order" },
  { key: "rx_pending", group: "Customer: orders", label: "Prescription under review", when: "Order with prescription medicine is placed" },
  { key: "rx_approved", group: "Customer: orders", label: "Prescription approved, pay now", when: "Pharmacist approves the prescription" },
  { key: "rx_rejected", group: "Customer: orders", label: "Prescription not approved", when: "Pharmacist rejects the prescription" },
  { key: "paid", group: "Customer: orders", label: "Payment received, processing", when: "Payment is confirmed (order moves to Processing)" },
  { key: "payment_failed", group: "Customer: orders", label: "Payment didn't go through", when: "iPay reports a failed or short payment" },
  { key: "shipped", group: "Customer: orders", label: "Out for delivery / ready to collect", when: "You set the order to Out for delivery" },
  { key: "delivered", group: "Customer: orders", label: "Delivered / collected", when: "You set the order to Delivered" },
  { key: "cancelled", group: "Customer: orders", label: "Order cancelled", when: "You or the system cancels the order" },
  { key: "refunded", group: "Customer: orders", label: "Refund sent", when: "You mark a refund as Refunded" },
  { key: "welcome", group: "Customer: account", label: "Welcome", when: "Someone creates an account" },
  { key: "password_reset", group: "Customer: account", label: "Password reset", when: "Someone asks to reset their password" },
  { key: "link_orders", group: "Customer: account", label: "Confirm earlier orders", when: "A new account's email has earlier guest orders" },
  { key: "contact_ack", group: "Customer: account", label: "Message received", when: "Someone uses the contact form" },
  { key: "new_order", group: "Store owner", label: "New order alert", when: "Any order is placed (sent to your store email)" },
  { key: "payment_received", group: "Store owner", label: "Order paid alert", when: "An order is paid (sent to your store email)" },
  { key: "contact_staff", group: "Store owner", label: "Website message", when: "Someone uses the contact form (sent to your store email)" },
];

/** Sample data for previews. */
export const SAMPLE_ORDER: OrderLike = {
  number: "HH2611240001", accessToken: "preview", name: "Jane Wanjiku", email: "jane@example.com", phone: "254712345678",
  county: "Nairobi", town: "Westlands", address: "Mpaka Road, Apt 4B", deliveryZone: "Flat Shipping Rate", deliveryFee: 250,
  subtotal: 3590, discount: 0, couponCode: null, total: 3840, status: "pending_payment", paymentStatus: "unpaid", notes: "Please call before delivery.",
  items: [{ name: "Cetaphil Daily Defense Moisturiser SPF 50+ 50g", qty: 1, price: 3590 }],
};

export async function renderAny(key: string): Promise<Rendered | null> {
  const o = SAMPLE_ORDER;
  const order = ["placed", "rx_pending", "rx_approved", "rx_rejected", "paid", "payment_failed", "shipped", "delivered", "cancelled", "refunded"];
  if (order.includes(key)) {
    const k = key as OrderEmailKind;
    const o2 = k === "rx_pending" ? { ...o, status: "awaiting_rx" } : k === "paid" || k === "shipped" || k === "delivered" ? { ...o, status: "processing", paymentStatus: "paid" } : o;
    return renderOrderEmail(k, o2, { note: k === "rx_rejected" ? "The prescription has expired. Please ask your doctor for a new one." : k === "refunded" ? "QK12AB34CD" : k === "payment_failed" ? "cancelled on phone" : undefined, amount: 3840 });
  }
  if (key === "new_order") return renderStaffEmail("new_order", o);
  if (key === "payment_received") return renderStaffEmail("payment_received", { ...o, status: "processing", paymentStatus: "paid" });
  if (key === "welcome" || key === "password_reset" || key === "link_orders" || key === "contact_ack" || key === "contact_staff")
    return renderAccountEmail(key, { name: o.name, email: o.email, phone: "0712 345 678", link: `${STORE.appUrl}/reset-password?token=preview`, subject: "Do you have Panadol Extra?", body: "Hi, do you have Panadol Extra in stock? I'd like 3 packs delivered to Westlands." });
  return null;
}
