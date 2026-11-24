#!/usr/bin/env bash
# Build (or update) the site on the server. Then restart "healthhub" in aaPanel → Website → Node.js Project.
# Run from the project folder:  bash scripts/deploy.sh
set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -f .env ]; then echo "Missing .env - copy .env.example to .env and fill it in first."; exit 1; fi

# Back up the database before touching anything
if [ -f prisma/healthhub.db ]; then
  mkdir -p backups
  cp prisma/healthhub.db "backups/healthhub-$(date +%Y%m%d-%H%M%S).db"
  ls -1t backups/healthhub-*.db | tail -n +15 | xargs -r rm -f   # keep the last 14
fi

# aaPanel hands the folder to the "www" user; let root still run git here.
git config --global --get-all safe.directory | grep -qx "$PWD" || git config --global --add safe.directory "$PWD"
git pull --ff-only
npm ci --no-audit --no-fund
npx prisma generate
npx prisma db push --skip-generate   # adds new tables/columns; never drops data without asking
mkdir -p storage/uploads storage/prescriptions
npm run build

# aaPanel runs Node projects as the "www" user: it must be able to write the database and uploads.
if id www >/dev/null 2>&1; then chown -R www:www prisma storage backups .next; fi

echo
echo "Build done. Now restart the project: aaPanel → Website → Node.js Project → healthhub → Restart."
