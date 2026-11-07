import fs from "node:fs";
import path from "node:path";
import express from "express";
import multer from "multer";
import { config, LANGS } from "./config.js";
import { client, connect, contentSchema, seed } from "./db.js";
import { serveImage } from "./files.js";
import { startIcalSync } from "./ical.js";
import { publicRoutes } from "./routes/public.js";
import { authRoutes } from "./routes/auth.js";
import { adminRoutes } from "./routes/admin.js";
import { bad } from "./routes/helpers.js";

/** Keeps retrying instead of crashing, so a slow or misconfigured database shows up clearly in the logs. */
async function connectWithRetry() {
  for (let attempt = 1; ; attempt++) {
    try {
      await connect();
      return;
    } catch (err) {
      const hint =
        err.syscall === "querySrv"
          ? " — the SRV lookup of the mongodb+srv:// URI failed: check the container DNS (DNS_SERVERS / compose `dns`) or use Atlas' standard mongodb:// connection string"
          : err.name === "MongoServerSelectionError"
            ? " — server unreachable: check the IP access list of the cluster (Atlas › Network Access) and the credentials"
            : "";
      const wait = Math.min(30, attempt * 3);
      console.error(`[db] connection failed (attempt ${attempt}): ${err.message}${hint}. Retrying in ${wait}s…`);
      await client.close().catch(() => {});
      await new Promise((r) => setTimeout(r, wait * 1000));
    }
  }
}

await connectWithRetry();
await seed();
startIcalSync();

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", /^\d+$/.test(config.trustProxy) ? Number(config.trustProxy) : config.trustProxy);

app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(self)");
  next();
});

app.get("/healthz", async (_req, res) => {
  try {
    await client.db(config.mongoDb).command({ ping: 1 });
    res.json({ ok: true });
  } catch {
    res.status(503).json({ ok: false });
  }
});

const api = express.Router();
api.use(express.json({ limit: "300kb" }));
api.use(publicRoutes);
api.use("/auth", authRoutes);
api.use("/admin", adminRoutes);
api.use((_req, res) => bad(res, "Not found", 404));
api.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError) return bad(res, err.code === "LIMIT_FILE_SIZE" ? "Fichier trop lourd (15 Mo max)." : err.message);
  if (err.type === "entity.parse.failed") return bad(res, "Requête invalide.");
  console.error(err);
  res.status(500).json({ error: "Erreur serveur." });
});
app.use("/api", api);

app.get("/uploads/:id", (req, res, next) => serveImage(req, res).catch(next));

// ---- SEO: robots.txt & sitemap.xml (with hreflang alternates)
app.get("/robots.txt", (_req, res) => {
  res.type("text/plain").send(`User-agent: *\nDisallow: /admin\nDisallow: /api\nSitemap: ${config.publicUrl}/sitemap.xml\n`);
});

app.get("/sitemap.xml", (_req, res) => {
  const paths = [...contentSchema.pages.map((p) => p.path), "/plan-du-site"];
  const href = (lang, p) => `${config.publicUrl}${lang === "fr" ? "" : `/${lang}`}${p === "/" && lang !== "fr" ? "" : p}`;
  const urls = paths.flatMap((p) =>
    LANGS.map(
      (lang) =>
        `<url><loc>${href(lang, p)}</loc>${LANGS.map((l) => `<xhtml:link rel="alternate" hreflang="${l}" href="${href(l, p)}"/>`).join("")}<xhtml:link rel="alternate" hreflang="x-default" href="${href("fr", p)}"/></url>`,
    ),
  );
  res
    .type("application/xml")
    .send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${urls.join("")}</urlset>`);
});

if (fs.existsSync(config.staticDir)) {
  app.use("/assets", express.static(path.join(config.staticDir, "assets"), { maxAge: "1y", immutable: true }));
  app.use(express.static(config.staticDir, { index: false, maxAge: "1d" }));
  const indexHtml = fs.readFileSync(path.join(config.staticDir, "index.html"), "utf8");
  // SPA fallback: every other route renders the React app, with the right <html lang>.
  app.get(/^(?!\/api\/|\/uploads\/).*/, (req, res) => {
    const lang = /^\/(en|de)(\/|$)/.exec(req.path)?.[1] ?? "fr";
    res.setHeader("Cache-Control", "no-cache");
    res.type("html").send(indexHtml.replace('<html lang="fr">', `<html lang="${lang}">`));
  });
}

const server = app.listen(config.port, () => console.log(`Manoir de la Champagne — listening on :${config.port}`));

const shutdown = () => server.close(() => client.close().finally(() => process.exit(0)));
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
