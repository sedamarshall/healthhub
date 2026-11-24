# Deploying to the VPS (aaPanel)

Live address: **https://healthhub.touchinspiration.com**

How it runs: Node.js runs the site on `127.0.0.1:3001` under PM2. The aaPanel Nginx site for the domain forwards traffic to it and handles SSL.

Commands below are run in aaPanel's **Terminal** (or SSH) as root.

---

## 1. One-time server setup

1. **DNS:** add an `A` record for `healthhub` on `touchinspiration.com` pointing to the VPS IP. Wait until it resolves.
2. **aaPanel → App Store:** install
   - **Nginx**,
   - **PM2 Manager**, picking Node **v22** (v20 also works).
3. **Install git**, then check the versions:
   ```bash
   apt install -y git || yum install -y git
   node -v && npm -v && pm2 -v
   ```
4. **Small VPS (under 2 GB RAM):** add swap so the build doesn't run out of memory.
   ```bash
   fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
   echo '/swapfile none swap sw 0 0' >> /etc/fstab
   ```

## 2. Get the code

```bash
cd /www/wwwroot
git clone https://github.com/sedamarshall/healthhub.git healthhub.touchinspiration.com
cd healthhub.touchinspiration.com
```

If the repo is private, git asks for a username and password. Use your GitHub username, and a **personal access token** (GitHub → Settings → Developer settings → Tokens) as the password.

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

## 5. Build and start

```bash
bash scripts/deploy.sh
pm2 startup     # run the command it prints, so the site comes back after a reboot
pm2 save
```

Check that it's up:

```bash
curl -I http://127.0.0.1:3001
```

You should get `HTTP/1.1 200`.

## 6. Connect the domain in aaPanel

1. **Website → Add site.**
   - Domain: `healthhub.touchinspiration.com`
   - PHP version: **Static**
   - Database: none
2. Open the site's settings:
   1. **SSL → Let's Encrypt:** tick the domain and apply. Then turn on **Force HTTPS**.
   2. **Reverse proxy → Add.**
      - Name: `healthhub`
      - Target URL: `http://127.0.0.1:3001`
      - Sent domain: `$host`
      - Save.
   3. **Config file:** inside the `server { ... }` block, add this so product-image uploads up to 12 MB work:
      ```nginx
      client_max_body_size 12m;
      ```
3. Open https://healthhub.touchinspiration.com, then sign in at `/signin` with your admin account.

## 7. After going live

- **iPay:** payment callbacks go to `https://healthhub.touchinspiration.com/api/ipay/callback`. The site sends this address with each payment.
- **Email:** Admin → Settings → Email → **Test connection** and **Send test**.
- **Backups:** `scripts/deploy.sh` copies the database to `backups/` on every deploy. For daily backups too, add an aaPanel **Cron** (Shell script, daily):
  ```bash
  cd /www/wwwroot/healthhub.touchinspiration.com && mkdir -p backups && cp prisma/healthhub.db backups/daily-$(date +\%a).db
  ```
- **Search engines:** if this address is only a preview before moving to healthhub.ke, keep it out of search engines until then.

## Updating the site later

1. On your PC, push the changes:
   ```powershell
   git add -A; git commit -m "Describe the change"; git push
   ```
2. On the server:
   ```bash
   cd /www/wwwroot/healthhub.touchinspiration.com && bash scripts/deploy.sh
   ```

`deploy.sh` does the following:
1. Backs up the database.
2. Pulls the code and installs packages.
3. Adds any new database columns.
4. Builds the site.
5. Restarts it with a brief reload.

## Troubleshooting

| Problem | Fix |
|---|---|
| 502 Bad Gateway | `pm2 logs healthhub --lines 80`. Often `.env` is missing or the build failed. |
| Can't sign in | Check that `APP_URL` starts with `https://` and that `AUTH_SECRET` is set. Then run `pm2 reload healthhub --update-env`. |
| Build killed / out of memory | Add swap (step 1). |
| Images upload fails | Add `client_max_body_size 12m;` (step 6). |
