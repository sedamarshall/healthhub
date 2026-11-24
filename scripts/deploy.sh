#!/usr/bin/env bash
# Update the live site: pull the latest code, install, update the database tables, build, restart.
# Run on the server from the project folder:  bash scripts/deploy.sh
set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -f .env ]; then echo "Missing .env - copy .env.example to .env and fill it in first."; exit 1; fi

# Back up the database before touching anything
if [ -f prisma/healthhub.db ]; then
  mkdir -p backups
  cp prisma/healthhub.db "backups/healthhub-$(date +%Y%m%d-%H%M%S).db"
  ls -1t backups/healthhub-*.db | tail -n +15 | xargs -r rm -f   # keep the last 14
fi

git pull --ff-only
npm ci --no-audit --no-fund
npx prisma generate
npx prisma db push --skip-generate   # adds new tables/columns; never drops data without asking
mkdir -p storage/uploads storage/prescriptions
npm run build

if pm2 describe healthhub >/dev/null 2>&1; then
  pm2 reload healthhub --update-env
else
  pm2 start ecosystem.config.cjs
  pm2 save
fi
echo "Deployed. Check: pm2 logs healthhub --lines 50"
