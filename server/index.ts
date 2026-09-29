import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { env } from "./config/env";
import { createApp } from "./app";

async function startServer() {
  const app = createApp();

  // Frontend: Vite middleware in development, built assets in production.
  if (!env.isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(env.port, env.host, () => {
    console.log(`Server running on http://${env.host}:${env.port} (${env.nodeEnv})`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exitCode = 1;
});
