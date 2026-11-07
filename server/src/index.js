import fs from "node:fs";
import path from "node:path";
import express from "express";
import { config } from "./config.js";
import { seed } from "./db.js";
import { api } from "./routes.js";

await seed();

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", /^\d+$/.test(config.trustProxy) ? Number(config.trustProxy) : config.trustProxy);

app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  next();
});

app.get("/healthz", (_req, res) => res.json({ ok: true }));
app.use("/api", api);
app.use("/uploads", express.static(path.join(config.dataDir, "uploads"), { maxAge: "30d", immutable: true }));

if (fs.existsSync(config.staticDir)) {
  app.use(express.static(config.staticDir, { index: false, maxAge: "1h" }));
  // Hashed build assets can be cached for a long time.
  app.use("/assets", express.static(path.join(config.staticDir, "assets"), { maxAge: "1y", immutable: true }));
  // SPA fallback: every non-API route renders the React app.
  app.get(/^(?!\/api\/|\/uploads\/).*/, (_req, res) => res.sendFile(path.join(config.staticDir, "index.html")));
}

app.listen(config.port, () => console.log(`Manoir de la Champagne — http://localhost:${config.port}`));
