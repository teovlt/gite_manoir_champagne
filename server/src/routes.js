import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import express from "express";
import multer from "multer";
import { config } from "./config.js";
import { contentSchema, db, getSetting, logActivity, setSetting } from "./db.js";
import { clearSessionCookie, rateLimit, sessionUserId, setSessionCookie, verifyPassword } from "./auth.js";
import { notifyNewRequest } from "./mail.js";

export const api = express.Router();
api.use(express.json({ limit: "200kb" }));

const SECTIONS = ["accueil", "gite", "jardins", "region"];
const uploadsDir = path.join(config.dataDir, "uploads");

// ---------- helpers ----------

const today = () => new Date().toISOString().slice(0, 10);
const str = (v, max = 5000) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const isDate = (v) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
const isSafeLink = (v) => typeof v === "string" && /^(\/|#|https?:\/\/)/.test(v);
const optInt = (v, max) => (v === null || v === undefined || v === "" ? null : Math.min(Math.max(0, Math.trunc(Number(v)) || 0), max));

const bad = (res, error) => res.status(400).json({ error });

const toEvent = (r) => ({
  id: r.id,
  title: r.title,
  startDate: r.start_date,
  endDate: r.end_date,
  text: r.text,
  link: r.link,
  active: Boolean(r.active),
});

/** SQLite datetime('now') is UTC without a zone marker. */
const iso = (sqlDate) => (sqlDate ? `${sqlDate.replace(" ", "T")}Z` : null);

const toPhoto = (r) => ({ id: r.id, key: r.key, section: r.section, alt: r.alt, url: r.url });

function currentBanner() {
  if (!getSetting("bannerEnabled", true)) return null;
  const row = db
    .prepare("SELECT * FROM events WHERE active = 1 AND end_date >= ? ORDER BY start_date DESC, id DESC LIMIT 1")
    .get(today());
  return row ? toEvent(row) : null;
}

function contentValues() {
  const values = {};
  for (const row of db.prepare("SELECT page, key, value FROM content").all()) {
    (values[row.page] ??= {})[row.key] = row.value;
  }
  return values;
}

const removeUpload = (url) => {
  if (url?.startsWith("/uploads/")) fs.rm(path.join(uploadsDir, path.basename(url)), { force: true }, () => {});
};

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadsDir,
    filename: (_req, file, cb) => cb(null, `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${path.extname(file.originalname).toLowerCase()}`),
  }),
  limits: { fileSize: 10 * 1024 * 1024, files: 20 },
  fileFilter: (_req, file, cb) => cb(null, ["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)),
});

// ---------- public ----------

api.get("/site", (_req, res) => {
  res.json({
    content: contentValues(),
    navLinks: getSetting("navLinks", contentSchema.navLinks),
    photos: db.prepare("SELECT * FROM photos ORDER BY sort, id").all().map(toPhoto),
    pricing: getSetting("pricing"),
    banner: currentBanner(),
  });
});

api.post("/requests", rateLimit({ windowMs: 10 * 60 * 1000, max: 5 }), async (req, res) => {
  const b = req.body ?? {};
  if (b.website) return res.status(201).json({ ok: true }); // honeypot: silently ignore bots
  const name = str(b.name, 120);
  const email = str(b.email, 200);
  if (!name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return bad(res, "Nom et e-mail valides requis.");
  const arrival = isDate(b.arrival) ? b.arrival : null;
  const departure = isDate(b.departure) ? b.departure : null;
  if (arrival && departure && departure <= arrival) return bad(res, "Dates incohérentes.");
  const adults = optInt(b.adults, 30);
  const children = optInt(b.children, 30);
  if ((adults ?? 0) + (children ?? 0) > 14) return bad(res, "Le gîte accueille 14 personnes au maximum.");

  const request = {
    name,
    email,
    arrival,
    departure,
    dates: str(b.dates, 200) || null,
    adults,
    children,
    message: str(b.message, 4000) || null,
  };
  db.prepare(
    "INSERT INTO requests (name, email, arrival, departure, dates, adults, children, message) VALUES (:name, :email, :arrival, :departure, :dates, :adults, :children, :message)",
  ).run(request);
  notifyNewRequest(request).catch((err) => console.error("[mail]", err.message));
  res.status(201).json({ ok: true });
});

// ---------- auth ----------

const findUser = (id) => db.prepare("SELECT id, email, name FROM users WHERE id = ?").get(id);

api.post("/auth/login", rateLimit({ windowMs: 15 * 60 * 1000, max: 10 }), async (req, res) => {
  const email = str(req.body?.email, 200);
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return res.status(401).json({ error: "E-mail ou mot de passe incorrect." });
  }
  setSessionCookie(res, user.id, Boolean(req.body?.remember));
  res.json({ id: user.id, email: user.email, name: user.name });
});

api.post("/auth/logout", (_req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

api.get("/auth/me", (req, res) => {
  const user = findUser(sessionUserId(req));
  if (!user) return res.status(401).json({ error: "Non connecté." });
  res.json(user);
});

// ---------- admin ----------

const admin = express.Router();
api.use("/admin", admin);

admin.use((req, res, next) => {
  const user = findUser(sessionUserId(req));
  if (!user) return res.status(401).json({ error: "Session expirée, reconnectez-vous." });
  req.user = user;
  next();
});

const firstName = (req) => req.user.name.split(" ")[0];

admin.get("/dashboard", (_req, res) => {
  const yearStart = `${new Date().getFullYear()}-01-01`;
  const banner = currentBanner();
  const lastActivity = db.prepare("SELECT * FROM activity ORDER BY id DESC LIMIT 1").get();
  res.json({
    stats: {
      pages: contentSchema.pages.length,
      activeEvents: db.prepare("SELECT COUNT(*) AS n FROM events WHERE active = 1 AND end_date >= ?").get(today()).n,
      bannerTitle: banner?.title ?? null,
      requestsThisYear: db.prepare("SELECT COUNT(*) AS n FROM requests WHERE created_at >= ?").get(yearStart).n,
      newRequests: db.prepare("SELECT COUNT(*) AS n FROM requests WHERE status = 'nouvelle'").get().n,
      lastChange: lastActivity ? { at: iso(lastActivity.created_at), by: lastActivity.user_name } : null,
    },
    activity: db
      .prepare("SELECT * FROM activity ORDER BY id DESC LIMIT 8")
      .all()
      .map((a) => ({ id: a.id, userName: a.user_name, message: a.message, createdAt: iso(a.created_at) })),
    requests: db
      .prepare("SELECT * FROM requests ORDER BY id DESC LIMIT 20")
      .all()
      .map((r) => ({ ...r, createdAt: iso(r.created_at), created_at: undefined })),
  });
});

admin.patch("/requests/:id", (req, res) => {
  const status = req.body?.status;
  if (!["nouvelle", "repondue"].includes(status)) return bad(res, "Statut inconnu.");
  db.prepare("UPDATE requests SET status = ? WHERE id = ?").run(status, req.params.id);
  res.json({ ok: true });
});

admin.delete("/requests/:id", (req, res) => {
  db.prepare("DELETE FROM requests WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

// Content

admin.get("/content", (_req, res) => {
  res.json({ values: contentValues(), navLinks: getSetting("navLinks", contentSchema.navLinks) });
});

admin.put("/content/:page", (req, res) => {
  const page = contentSchema.pages.find((p) => p.id === req.params.page);
  if (!page) return res.status(404).json({ error: "Page inconnue." });
  const allowed = new Set(page.sections.flatMap((s) => s.fields.map((f) => f.key)));
  const values = req.body?.values ?? {};
  const upsert = db.prepare(
    "INSERT INTO content (page, key, value, updated_at) VALUES (?, ?, ?, datetime('now')) ON CONFLICT(page, key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
  );
  for (const [key, value] of Object.entries(values)) {
    if (allowed.has(key) && typeof value === "string") upsert.run(page.id, key, value.slice(0, 5000));
  }
  logActivity(firstName(req), `a modifié le texte de la page ${page.label}`);
  res.json({ ok: true });
});

admin.put("/nav-links", (req, res) => {
  const links = Array.isArray(req.body?.links) ? req.body.links : null;
  if (!links || links.length > 12) return bad(res, "Liste de liens invalide.");
  const clean = links.map((l) => ({ label: str(l.label, 60), href: str(l.href, 300) })).filter((l) => l.label && l.href);
  if (clean.some((l) => !isSafeLink(l.href))) return bad(res, "Les liens doivent commencer par /, # ou https://");
  setSetting("navLinks", clean);
  logActivity(firstName(req), "a mis à jour les liens du pied de page");
  res.json({ ok: true, links: clean });
});

// Photos

admin.get("/photos", (_req, res) => {
  res.json(db.prepare("SELECT * FROM photos ORDER BY sort, id").all().map(toPhoto));
});

admin.post("/photos", upload.array("files"), (req, res) => {
  const section = SECTIONS.includes(req.body?.section) ? req.body.section : "accueil";
  if (!req.files?.length) return bad(res, "Aucune image valide (JPG, PNG ou WebP, 10 Mo max).");
  const maxSort = db.prepare("SELECT COALESCE(MAX(sort), 0) AS m FROM photos").get().m;
  const insert = db.prepare("INSERT INTO photos (key, section, alt, url, sort) VALUES (NULL, ?, ?, ?, ?)");
  req.files.forEach((f, i) => {
    const alt = path.basename(f.originalname, path.extname(f.originalname)).replace(/[-_]+/g, " ");
    insert.run(section, alt, `/uploads/${f.filename}`, maxSort + i + 1);
  });
  logActivity(firstName(req), `a ajouté ${req.files.length} photo${req.files.length > 1 ? "s" : ""}`);
  res.status(201).json({ ok: true });
});

admin.put("/photos/:id/file", upload.single("file"), (req, res) => {
  const photo = db.prepare("SELECT * FROM photos WHERE id = ?").get(req.params.id);
  if (!photo) return res.status(404).json({ error: "Photo introuvable." });
  if (!req.file) return bad(res, "Image invalide (JPG, PNG ou WebP, 10 Mo max).");
  removeUpload(photo.url);
  db.prepare("UPDATE photos SET url = ? WHERE id = ?").run(`/uploads/${req.file.filename}`, photo.id);
  logActivity(firstName(req), `a remplacé la photo « ${photo.alt} »`);
  res.json({ ok: true });
});

admin.patch("/photos/:id", (req, res) => {
  const photo = db.prepare("SELECT * FROM photos WHERE id = ?").get(req.params.id);
  if (!photo) return res.status(404).json({ error: "Photo introuvable." });
  const alt = req.body?.alt !== undefined ? str(req.body.alt, 200) : photo.alt;
  // Slot photos stay in their page; free photos can move between sections.
  const section = !photo.key && SECTIONS.includes(req.body?.section) ? req.body.section : photo.section;
  db.prepare("UPDATE photos SET alt = ?, section = ? WHERE id = ?").run(alt, section, photo.id);
  res.json({ ok: true });
});

admin.delete("/photos/:id", (req, res) => {
  const photo = db.prepare("SELECT * FROM photos WHERE id = ?").get(req.params.id);
  if (!photo) return res.status(404).json({ error: "Photo introuvable." });
  removeUpload(photo.url);
  // A slot keeps its place on the page and falls back to a placeholder.
  if (photo.key) db.prepare("UPDATE photos SET url = NULL WHERE id = ?").run(photo.id);
  else db.prepare("DELETE FROM photos WHERE id = ?").run(photo.id);
  logActivity(firstName(req), `a retiré la photo « ${photo.alt} »`);
  res.json({ ok: true });
});

// Events & banner

admin.get("/events", (_req, res) => {
  res.json({
    bannerEnabled: getSetting("bannerEnabled", true),
    events: db.prepare("SELECT * FROM events ORDER BY start_date DESC, id DESC").all().map(toEvent),
  });
});

function parseEvent(body) {
  const e = {
    title: str(body?.title, 120),
    start_date: body?.startDate,
    end_date: body?.endDate,
    text: str(body?.text, 200),
    link: str(body?.link, 300),
    active: body?.active ? 1 : 0,
  };
  if (!e.title) return { error: "Le titre est obligatoire." };
  if (!isDate(e.start_date) || !isDate(e.end_date)) return { error: "Dates de début et de fin obligatoires." };
  if (e.end_date < e.start_date) return { error: "La fin doit être après le début." };
  if (e.link && !isSafeLink(e.link)) return { error: "Lien invalide." };
  return { event: e };
}

admin.post("/events", (req, res) => {
  const { event, error } = parseEvent(req.body);
  if (error) return bad(res, error);
  db.prepare("INSERT INTO events (title, start_date, end_date, text, link, active) VALUES (:title, :start_date, :end_date, :text, :link, :active)").run(event);
  logActivity(firstName(req), `a ajouté l'événement « ${event.title} »`);
  res.status(201).json({ ok: true });
});

admin.put("/events/:id", (req, res) => {
  const existing = db.prepare("SELECT * FROM events WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Événement introuvable." });
  const { event, error } = parseEvent(req.body);
  if (error) return bad(res, error);
  db.prepare(
    "UPDATE events SET title = :title, start_date = :start_date, end_date = :end_date, text = :text, link = :link, active = :active WHERE id = :id",
  ).run({ ...event, id: existing.id });
  const verb = existing.active !== event.active ? (event.active ? "a activé" : "a désactivé") : "a modifié";
  logActivity(firstName(req), `${verb} l'événement « ${event.title} »`);
  res.json({ ok: true });
});

admin.delete("/events/:id", (req, res) => {
  const existing = db.prepare("SELECT * FROM events WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Événement introuvable." });
  db.prepare("DELETE FROM events WHERE id = ?").run(existing.id);
  logActivity(firstName(req), `a supprimé l'événement « ${existing.title} »`);
  res.json({ ok: true });
});

admin.put("/banner", (req, res) => {
  const enabled = Boolean(req.body?.enabled);
  setSetting("bannerEnabled", enabled);
  logActivity(firstName(req), enabled ? "a affiché la bannière d'événements" : "a masqué la bannière d'événements");
  res.json({ ok: true, enabled });
});

// Pricing

admin.get("/pricing", (_req, res) => res.json(getSetting("pricing")));

admin.put("/pricing", (req, res) => {
  const current = getSetting("pricing");
  const body = req.body ?? {};
  const price = (v) => {
    const n = Number(String(v).replace(/\s/g, "").replace(",", "."));
    return Number.isFinite(n) && n >= 0 && n < 100000 ? Math.round(n * 100) / 100 : null;
  };
  const byId = (list) => new Map((Array.isArray(list) ? list : []).map((x) => [x.id, x]));
  const formulas = byId(body.formulas);
  const seasons = byId(body.seasons);
  const extras = byId(body.extras);

  const next = {
    formulas: current.formulas.map((f) => {
      const u = formulas.get(f.id);
      const low = u ? price(u.low) : f.low;
      const high = u ? price(u.high) : f.high;
      return { ...f, low: low ?? f.low, high: high ?? f.high };
    }),
    seasons: current.seasons.map((s) => ({ ...s, periods: seasons.has(s.id) ? str(seasons.get(s.id).periods, 200) : s.periods })),
    extras: current.extras.map((x) => {
      const p = extras.has(x.id) ? price(extras.get(x.id).price) : null;
      return { ...x, price: p ?? x.price };
    }),
  };
  if (next.formulas.some((f) => f.low > f.high)) return bad(res, "Le prix bas doit être inférieur ou égal au prix haut.");

  const changes = [];
  next.formulas.forEach((f, i) => {
    const o = current.formulas[i];
    if (o.low !== f.low || o.high !== f.high) changes.push(`${f.name} ${o.low}–${o.high} → ${f.low}–${f.high} €`);
  });
  next.extras.forEach((x, i) => {
    if (current.extras[i].price !== x.price) changes.push(`${x.label} ${current.extras[i].price} → ${x.price} €`);
  });
  setSetting("pricing", next);
  logActivity(firstName(req), changes.length ? `a mis à jour les tarifs (${changes.join(" ; ")})` : "a mis à jour les périodes de saison");
  res.json(next);
});

// Error handler (multer limits, JSON parse errors…)
api.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError) return bad(res, err.code === "LIMIT_FILE_SIZE" ? "Fichier trop lourd (10 Mo max)." : err.message);
  if (err.type === "entity.parse.failed") return bad(res, "Requête invalide.");
  console.error(err);
  res.status(500).json({ error: "Erreur serveur." });
});
