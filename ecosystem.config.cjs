// PM2 process file for the live server (aaPanel "PM2 Manager" or `pm2 start ecosystem.config.cjs`).
// The site listens on 127.0.0.1:3001; Nginx in aaPanel forwards healthhub.touchinspiration.com to it.
module.exports = {
  apps: [
    {
      name: "healthhub",
      cwd: __dirname,
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3001 -H 127.0.0.1",
      instances: 1, // SQLite: keep a single process
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "700M",
      env: { NODE_ENV: "production" },
    },
  ],
};
