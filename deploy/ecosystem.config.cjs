// PM2 process file for the VPS (deploy/README.md §7).
//   pm2 start deploy/ecosystem.config.cjs && pm2 save
const path = require("path");

module.exports = {
  apps: [
    {
      name: "siapajar",
      // Repository root: the server reads .env, dist/, migrations and email images relative to it.
      cwd: path.resolve(__dirname, ".."),
      script: "dist/server.cjs",
      node_args: "--enable-source-maps",
      // One process only: rate limits and the Midtrans status throttle are kept in memory (server/README.md §10).
      instances: 1,
      exec_mode: "fork",
      env: { NODE_ENV: "production" },
      max_memory_restart: "400M",
      time: true,
    },
  ],
};
