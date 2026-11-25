# Deploying to the VPS (aaPanel Node.js Project)

Live address: **https://healthhub.touchinspiration.com**

The site runs as a second Node.js project in aaPanel (**Website → Node.js Project**), next to your existing "Academy" project:
- It listens on `127.0.0.1:3010`, so it doesn't clash with Academy.
- aaPanel handles the domain, the reverse proxy and SSL.
- Node **v22.11.0** (already installed) is fine.

Commands are run in aaPanel's **Terminal** (or SSH) as root.

---

## 1. DNS

Add an `A` record for `healthhub` on `touchinspiration.com`, pointing to the VPS IP.

## 2. Get the code

```bash
cd /www/wwwroot
git clone https://github.com/sedamarshall/healthhub.git healthhub.touchinspiration.com
cd healthhub.touchinspiration.com
```

If git isn't installed: `apt install -y git`.

If the repo is private, git asks for a username and password. Use your GitHub username, and a **personal access token** (GitHub → Settings → Developer settings → Tokens) as the password.

**Check that port 3010 is free.** The command below should print nothing:

```bash
ss -ltnp | grep ':3010 '
```

If it prints something, change `3010` in `package.json` → `"start:server"` to another free port, and use that port in step 6.

## 3. Upload the database and uploaded files

These are not in GitHub. Upload them with aaPanel → **Files**, into the project folder:

| File on your PC | Put it on the server at |
|---|---|
| `D:\healthhub-store\deploy-upload\healthhub.db` | `prisma/healthhub.db` |
| `D:\healthhub-store\deploy-upload\storage.tar.gz` | the project folder, then extract it (below) |

```bash
mkdir -p storage && tar -xzf storage.tar.gz -C storage && rm storage.tar.gz
```

> The database holds the full catalogue (4,257 products), your admin account and existing orders. Upload it **once** only. Uploading it again later would wipe live orders.

## 4. Create `.env`

```bash
cp .env.example .env
openssl rand -hex 32      # copy the output for AUTH_SECRET
nano .env
```

Set at least:

```env
DATABASE_URL="file:./healthhub.db"
APP_URL="https://healthhub.touchinspiration.com"
AUTH_SECRET="<the 64-character value from openssl>"

IPAY_VENDOR_ID="..."     # from your iPay merchant account
IPAY_HASH_KEY="..."
IPAY_LIVE="1"

SMTP_HOST="..."          # your SMTP
SMTP_PORT="587"
SMTP_USER="..."
SMTP_PASS="..."
MAIL_FROM="Health Hub Chemist <orders@healthhub.ke>"
```

Notes:
- The site **refuses to start sign-ins** without a strong `AUTH_SECRET`.
- Leaving the iPay keys empty shows the test payment page. Don't take real orders that way.

## 5. Build

```bash
bash scripts/deploy.sh
```

This takes a few minutes. It ends with "Build done".

## 6. Add the project in aaPanel

**Website → Node.js Project → Add Project**, and fill in:

| Field | Value |
|---|---|
| Project directory | `/www/wwwroot/healthhub.touchinspiration.com` |
| Project name | `healthhub` |
| Run opt / Start command | `start:server` (choose it from the list) |
| Port | `3010` |
| Run user | `www` |
| Node version | `v22.11.0` |
| Package manager | npm. Untick "install node_modules" if offered; the build already did it. |
| Bind domain | `healthhub.touchinspiration.com` |

Save. The status should show **Running**.

Then finish the setup:

1. **SSL:** click **Not Set** in the SSL column → Let's Encrypt → apply. Then turn on **Force HTTPS**.
2. **Upload size:** open the project's **Config file / Nginx config**. Inside the `server { ... }` block, add this so product-image uploads up to 12 MB work, then save:
   ```nginx
   client_max_body_size 12m;
   ```
3. **Check it works:** open https://healthhub.touchinspiration.com, then sign in at `/signin` with your admin account.

## 7. After going live

- **iPay:** payment callbacks go to `https://healthhub.touchinspiration.com/api/ipay/callback`. The site sends this address with each payment.
- **Email:** Admin → Settings → Email → **Test connection** and **Send test**.
- **Backups:** every deploy copies the database to `backups/`. For daily backups too, add an aaPanel **Cron** (Shell script, daily):
  ```bash
  cd /www/wwwroot/healthhub.touchinspiration.com && mkdir -p backups && cp prisma/healthhub.db backups/daily-$(date +\%a).db
  ```
- **Search engines:** if this address is only a preview before moving to healthhub.ke, keep it out of search engines until then.

## 8. Security setup (do before announcing the store)

### 8.1 Block direct access to private files (most important)

The project folder sits inside aaPanel's web root. Nginx must never hand out the database, `.env`, backups or prescriptions directly.

In aaPanel → Node.js Project → healthhub → **Modify → Config file**, add inside the `server { ... }` block, **above** the proxy `location /`:

```nginx
# Private files: never served directly (the app serves what's public itself)
location ~ ^/(prisma|backups|storage|scripts|data|node_modules|src)(/|$) { return 404; }
location ~ /\.(?!well-known) { return 404; }   # .env, .git, .next ...
location ~* \.(db|db-journal|sqlite|env|log|sh|ts|md)$ { return 404; }
```

Save. Then check from any computer. Every line should show **404**:

```bash
for p in /prisma/healthhub.db /.env /backups/ /storage/prescriptions/ /.git/config /package.json; do echo "$(curl -s -o /dev/null -w '%{http_code}' https://healthhub.touchinspiration.com$p) $p"; done
```

`/package.json` may show 404 or the shop's own 404 page; both are fine. Anything showing **200** with file contents is a problem: stop and fix it.

### 8.2 Only accept web traffic through Cloudflare

The site reads the visitor's IP from Cloudflare (`CF-Connecting-IP`), and the rate limits depend on that. Make sure nobody can bypass Cloudflare by connecting to the server's IP directly. Run this once in the terminal. It allows ports 80/443 only from Cloudflare's published IP ranges:

```bash
apt install -y ufw
for ip in $(curl -s https://www.cloudflare.com/ips-v4) $(curl -s https://www.cloudflare.com/ips-v6); do ufw allow from $ip to any port 80,443 proto tcp; done
ufw allow 22/tcp          # SSH (change if you use another port)
ufw allow 8888/tcp        # aaPanel (use your panel port; see aaPanel → Settings)
ufw deny 80/tcp; ufw deny 443/tcp
ufw enable
```

Notes:
- aaPanel has its own **Security → Firewall** page that manages the same firewall. Keep the rules consistent there.
- This also affects **Academy**, which shares the server. If Academy isn't behind Cloudflare, either put it behind Cloudflare too, or skip this step and rely on Cloudflare's own settings in 8.3.
- Let's Encrypt renewals still work through Cloudflare.

### 8.3 Cloudflare settings (dash.cloudflare.com → your domain)

1. **SSL/TLS:** set **Full (strict)**, and turn on **Always Use HTTPS**.
2. **Security → Bots:** turn on **Bot Fight Mode**.
3. **Security → WAF → Rate limiting rules:** add a rule for paths `/login`, `/signin`, `/register`, `/checkout`, `/contact`, `/forgot-password`, `/track-order`. Allow at most **30 requests per minute per IP**, then **Block for 10 minutes**.
4. **Turnstile** (free CAPTCHA):
   1. Go to **Turnstile → Add site**, enter the domain, and choose widget mode **Managed**.
   2. Put the two keys in `.env`:
      ```env
      NEXT_PUBLIC_TURNSTILE_SITE_KEY="0x4AAAA..."
      TURNSTILE_SECRET_KEY="0x4AAAA..."
      ```
   3. Run `bash scripts/deploy.sh`. The site key is built into the pages, so a rebuild is needed.
   4. Restart the project.

   Turnstile then protects sign-up, contact, password reset and repeated failed logins.

### 8.4 Accounts and backups

- **Admin password:** sign in with a strong, unique admin password (a password manager helps). Remove `DEV_ADMIN_EMAIL` / `DEV_ADMIN_PASSWORD` from the server's `.env` if they're there.
- **2FA:** turn on two-step login for aaPanel, Cloudflare and GitHub.
- **Off-server backups:** copy the daily backups *off* the server, e.g. with aaPanel's backup feature to Google Drive or S3. Test restoring one copy once.
- **Monthly:** run `npm audit`, and keep Ubuntu security updates switched on.

## Updating the site later

1. On your PC, push the changes:
   ```powershell
   git add -A; git commit -m "Describe the change"; git push
   ```
2. On the server, rebuild:
   ```bash
   cd /www/wwwroot/healthhub.touchinspiration.com && bash scripts/deploy.sh
   ```
3. In aaPanel → Node.js Project → **healthhub** → **Restart**.

## Troubleshooting

| Problem | Fix |
|---|---|
| Status "Stopped" / 502 | Check the project's **Log** in aaPanel. Usually `.env` is missing, the build wasn't run, or the port is taken. |
| "attempt to write a readonly database" | `chown -R www:www prisma storage`, then restart the project. |
| Can't sign in | Check that `APP_URL` starts with `https://` and that `AUTH_SECRET` is set, then restart the project. |
| Build killed / out of memory | Add 2 GB swap: `fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile` |
| Image uploads fail | Add `client_max_body_size 12m;` (step 6). |
