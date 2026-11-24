# Health Hub Chemist store

Online pharmacy and health shop replacing the old OpenCart site. One Next.js app holds both the shop and the admin dashboard.

- **Shop:** home page, categories, product pages, search with suggestions, cart, checkout, customer accounts.
- **Payments:** iPay Africa: M-Pesa, Airtel Money and Visa/Mastercard on iPay's secure page.
- **Prescription medicines:** the customer uploads a prescription at checkout, a pharmacist approves it in the admin, then the customer pays.
- **Admin (`/admin`):** laid out like the Sellzy dashboard. Modules:
  - **Products:** all products, drafts, stock, reviews, create/edit with discount dates, categories, tags, brands, inventory.
  - **Orders:** all orders with a profit chart, return & refund, abandoned carts, transactions, prescriptions.
  - **Users:** all users, admin & staff, customers.
  - **Reports:** sales reports and top products/categories.
  - **Promotions:** coupons and flash sales.
  - **Content:** FAQ, privacy policy and terms pages.
  - **Settings:** general, shop/delivery fees, SEO, payment methods, maintenance mode.
  - Every list can be exported to CSV.
- **Shop extras:** product reviews and star ratings, a wishlist, coupon codes at the cart and checkout, and public `/faq`, `/privacy-policy` and `/terms` pages.
- **SEO:** every old `index.php?route=…` URL and old `/image/catalog/…` URL returns a 301 redirect to its new page. Also a sitemap, robots.txt and product structured data.

Stack: Next.js 15, React 19, Tailwind 4, Prisma 6, SQLite.

## Run it locally

```powershell
npm install
npx prisma db push
npm run db:import
npm run dev
```

- `npx prisma db push` creates `healthhub.db` from `prisma/schema.prisma`.
- `npm run db:import` loads categories, products and images from `data/`. It's safe to re-run.
- `npm run dev` starts the site at http://localhost:3000 for editing (Turbopack; each page compiles the first time you open it).
- For real speed, run the production build: `npm run build`, then `npm start`. Pages respond in about 0.1–0.4 s.
- Once, after the import: `npx tsx scripts/seed-extras.ts` creates the brand list and starter FAQ/policy pages.

Create a staff account (admin or pharmacist):

```powershell
npm run db:seed-admin -- you@healthhub.ke "a-strong-password" admin
```

The setup created a local test admin. Its login is in `.env` as `DEV_ADMIN_EMAIL` / `DEV_ADMIN_PASSWORD`. Delete it, or change its password, before going live.

### Payments in development

With `IPAY_VENDOR_ID` and `IPAY_HASH_KEY` empty, and only outside production, "Pay with iPay" opens a local test page with "simulate successful payment" and "simulate cancelled payment" buttons. This is switched off automatically when `NODE_ENV=production`.

## Data notes

| Item | What the import does |
|---|---|
| Product IDs | The old `product_id` is stored as `legacyId`. New SKUs are `HH00001`, etc. The old, non-unique code is kept as `legacyCode` and is searchable. |
| Images | All 4,228 images were downloaded from the old site (`scripts/download_images.py`) and converted to WebP, max 1000px (`scripts/optimize-images.ts`): 475 MB down to 104 MB, served from `public/img/w/`. Originals are kept in `data/images-original/` and are not served. No page loads anything from the old site. |
| Descriptions | Cleaned with an allowlist (`src/lib/sanitize.ts`). Links to other shops, SVGs and broken markup are removed. |
| Zero-price products | Imported as **draft** (hidden). |
| Demo product | **Archived**. Its old URL redirects to the home page. |
| "Test Main" category | Hidden. |
| Products to check | 87 products are flagged **needs review**: duplicates, no category, no image, and so on. Filter them in Admin → Products → "Needs review". |
| Prescription status | **No product is marked prescription-only yet**, because the old data has no such field. A pharmacist should mark them in Admin → Products: tick products, then "Mark prescription-only (Rx)". |
| Stock | "2-3 Days" products become *special order* (can be ordered, ships in 2–3 days). Products with no stock number are *out of stock*. |

Useful scripts:
- `npm run db:import -- --images-only`: re-link images.
- `npx tsx scripts/clean-descriptions.ts`: re-clean descriptions.

## Email

The shop sends branded emails (HTML plus a plain-text version) for every order event:

- **Customers:** order received, prescription under review / approved / not approved, payment received (order is now Processing), payment didn't go through, out for delivery (or ready to collect for pickup), delivered (or collected), cancelled and refund sent. Also welcome, password reset and "we've received your message".
- **Your store email** (Admin → Settings → General): a new-order alert, a paid alert and contact-form messages.

**Order statuses:** Awaiting pharmacist review (prescription orders) → Awaiting payment → **Processing** (set automatically when payment is confirmed) → Out for delivery / Ready for pickup → Delivered / Collected. An order can be cancelled at any point. If a customer pays by phone, till or cash, open the order and use **Mark as paid**.

**SMTP:** set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` and `MAIL_FROM` in `.env` and restart. Any provider works (Google Workspace with an app password, Zoho, Brevo, Mailgun...). Then open **Admin → Settings → Email** to test the connection, preview every template and send yourself a test email. Without SMTP, emails are only written to the server log.

## Go-live checklist

1. **Hosting:** use a VPS (or any host with a persistent disk), not serverless. SQLite, the uploaded product images (`storage/uploads`) and the prescriptions (`storage/prescriptions`) all live on disk. Back up `healthhub.db` and `storage/` every day.
2. **Environment variables in `.env`:**
   - `APP_URL=https://healthhub.ke`
   - a new long `AUTH_SECRET`
   - `STORE_PHONE` and `PPB_LICENCE_NO`
3. **iPay:**
   - In `.env` set `IPAY_VENDOR_ID`, `IPAY_HASH_KEY` and `IPAY_LIVE=1`.
   - Payments come back to `https://healthhub.ke/api/ipay/callback` (shown in Admin → Settings → Payment API). It must be reachable over HTTPS.
   - Before launch, compare `src/lib/ipay.ts` with the docs in your iPay merchant account (checkout URL, field order for the hash, IPN check) and run one real low-value payment end to end. An order is only marked paid after the server confirms the payment with iPay, so a mismatch shows up as "awaiting confirmation", never as a false "paid".
4. **Admin:** Admin → Settings → Payment API shows whether iPay is configured, test or live mode, and the callback URL.
5. **Build and start:** run `npm run build`, then `npm start`, behind nginx or Caddy with HTTPS.
6. **Switch DNS,** then submit `https://healthhub.ke/sitemap.xml` in Google Search Console.
7. **Check redirects:** test a few old URLs, e.g. `/index.php?route=product/product&product_id=1`. They should return 301 to the new page.
8. **Delivery methods:** set them in Admin → Settings → Shipping (add, edit, reorder, switch off). The old site's two methods (Flat Shipping Rate KES 250, Pickup From Store) are added by `npx tsx scripts/seed-shipping.ts`. The free-delivery amount is on the same screen.

## Not built yet

- SMS notifications. Email is built; SMS (e.g. Africa's Talking) would hook into `src/lib/notify.ts`.
- Phone-OTP login.
- Refunds from the admin. For now, cancelling a paid order puts the stock back, but the M-Pesa or card refund is done manually.
