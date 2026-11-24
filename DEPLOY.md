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
