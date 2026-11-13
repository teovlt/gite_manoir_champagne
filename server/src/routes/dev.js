import crypto from "node:crypto";
import os from "node:os";
import express from "express";
import multer from "multer";
import { config, LANGS } from "../config.js";
import { client, col, contentSchema, getSetting, logActivity, setSetting } from "../db.js";
import { rateLimit, sha256 } from "../auth.js";
import { syncIcal } from "../ical.js";
import { mailEnabled, send } from "../mail.js";
import { recentLogs, startedAt } from "../logs.js";
import { forgetMaintenanceCache } from "../maintenance.js";
import {
  backupFile,
  backupSchedule,
  createRestorePoint,
  deleteRestorePoint,
  inspectDump,
  listRestorePoints,
  readRestorePoint,
  restoreDump,
  runBackup,
} from "../backup.js";
import { isDeveloper } from "./auth.js";
import { bad, h, isEmail, oid, str, toUser } from "./helpers.js";

/** Developer space: everything below needs the "developer" role (mounted under /api/admin/dev). */
export const devRoutes = express.Router();

devRoutes.use((req, res, next) => (isDeveloper(req.user) ? next() : bad(res, "Réservé aux développeurs.", 403)));

const who = (req) => req.user.name.split(" ")[0];
/** Developer actions show in the owners' activity feed too: nothing happens behind their back. */
const log = (req, message) => logActivity(who(req), message);

const backupUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 400 * 1024 * 1024, files: 1 } }).single("file");
const ADMIN_ACCESS = ["normal", "readonly", "devOnly"];
const ACCESS_LABELS = { normal: "normal", readonly: "lecture seule", devOnly: "réservé aux développeurs" };

// ---------------------------------------------------------------- overview

/** Host of the database, without the credentials. */
const mongoHost = () => {
  try {
    return config.mongoUri.replace(/^mongodb(\+srv)?:\/\/([^@/]*@)?/, "").split("/")[0];
  } catch {
    return "?";
  }
};

const ENV_VARS = [
  ["NODE_ENV", false],
  ["PUBLIC_URL", false],
  ["MONGODB_URI", true],
  ["MONGODB_DB", false],
  ["DNS_SERVERS", false],
  ["SESSION_SECRET", true],
  ["ADMIN_EMAIL", false],
  ["ADMIN_PASSWORD", true],
  ["TRUST_PROXY", false],
  ["COOKIE_SECURE", false],
  ["ICAL_SYNC_MINUTES", false],
  ["RESEND_API_KEY", true],
  ["MAIL_FROM", false],
  ["NOTIFY_EMAIL", false],
  ["BACKUP_DB_MAIL", false],
  ["BACKUP_HOUR", false],
  ["BACKUP_NAME", false],
];

async function collectionStats(db) {
  const names = (await db.listCollections({}, { nameOnly: true }).toArray()).map((c) => c.name).filter((n) => !n.startsWith("system."));
  return Promise.all(
    names.sort().map(async (name) => {
      const count = await db.collection(name).estimatedDocumentCount();
      let size = null;
      try {
        const [stats] = await db
          .collection(name)
          .aggregate([{ $collStats: { storageStats: {} } }])
          .toArray();
        size = stats?.storageStats?.size ?? null;
      } catch {
        // $collStats is not allowed on every hosting plan.
      }
      return { name, count, size };
    }),
  );
}

devRoutes.get(
  "/overview",
  h(async (_req, res) => {
    const db = client.db(config.mongoDb);
    const t0 = performance.now();
    await db.command({ ping: 1 });
    const pingMs = Math.round(performance.now() - t0);
    const since = new Date(Date.now() - 24 * 3600 * 1000);
    const [stats, collections, maintenance, adminAccess, icalLastSync, backups, lastBackup, activeSessions, failed24h, buildInfo] =
      await Promise.all([
        db.stats().catch(() => null),
        collectionStats(db),
        getSetting("maintenance", { enabled: false }),
        getSetting("adminAccess", "normal"),
        getSetting("icalLastSync", null),
        backupSchedule(),
        col.backups
          .find({ trigger: { $ne: "restore-point" } })
          .sort({ at: -1 })
          .limit(1)
          .next(),
        col.sessions.countDocuments({ expiresAt: { $gt: new Date() } }),
        col.logins.countDocuments({ ok: false, at: { $gte: since } }),
        db
          .admin()
          .command({ buildInfo: 1 })
          .catch(() => null),
      ]);
    const mem = process.memoryUsage();
    res.json({
      server: {
        startedAt,
        uptime: Math.round(process.uptime()),
        node: process.version,
        platform: `${os.type()} ${os.release()} (${os.arch()})`,
        hostname: os.hostname(),
        memory: { rss: mem.rss, heapUsed: mem.heapUsed, heapTotal: mem.heapTotal },
        system: { total: os.totalmem(), free: os.freemem(), load: os.loadavg(), cpus: os.cpus().length },
        tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      database: {
        name: db.databaseName,
        host: mongoHost(),
        version: buildInfo?.version ?? null,
        pingMs,
        dataSize: stats?.dataSize ?? null,
        storageSize: stats?.storageSize ?? null,
        indexSize: stats?.indexSize ?? null,
        collections,
      },
      env: ENV_VARS.map(([name, secret]) => ({
        name,
        set: Boolean(process.env[name]),
        value: secret || !process.env[name] ? null : process.env[name],
      })),
      mail: { enabled: mailEnabled, from: config.mail?.from ?? null, notify: config.mail?.to ?? null },
      maintenance,
      adminAccess,
      ical: icalLastSync,
      backups: { schedule: backups, last: lastBackup },
      security: { activeSessions, failed24h },
    });
  }),
);

// ---------------------------------------------------------------- maintenance & access

devRoutes.put(
  "/maintenance",
  h(async (req, res) => {
    const b = req.body ?? {};
    const message = Object.fromEntries(LANGS.map((l) => [l, str(b.message?.[l], 1000)]));
    const until = b.until && !Number.isNaN(Date.parse(b.until)) ? new Date(b.until) : null;
    const previous = await getSetting("maintenance", { enabled: false });
    const value = { enabled: Boolean(b.enabled), message, until, by: req.user.name, at: new Date() };
    await setSetting("maintenance", value);
    forgetMaintenanceCache();
    if (value.enabled !== Boolean(previous.enabled)) {
      await log(req, value.enabled ? "a mis le site public en maintenance" : "a remis le site public en ligne");
      console.warn(`[dev] maintenance ${value.enabled ? "ON" : "OFF"} by ${req.user.email}`);
    }
    res.json(value);
  }),
);

devRoutes.put(
  "/access",
  h(async (req, res) => {
    const mode = req.body?.mode;
    if (!ADMIN_ACCESS.includes(mode)) return bad(res, "Mode inconnu.");
    await setSetting("adminAccess", mode);
    await log(req, `a passé l'administration en accès « ${ACCESS_LABELS[mode]} »`);
    console.warn(`[dev] admin access "${mode}" by ${req.user.email}`);
    res.json({ mode });
  }),
);

// ---------------------------------------------------------------- sessions & sign-ins

const usersById = async (ids) => {
  const users = await col.users.find({ _id: { $in: ids } }, { projection: { name: 1, email: 1, role: 1, sessionVersion: 1 } }).toArray();
  return new Map(users.map((u) => [String(u._id), u]));
};

/** Open sessions (a session whose user changed password or was deleted is dead and left out). */
devRoutes.get(
  "/sessions",
  h(async (req, res) => {
    const sessions = await col.sessions
      .find({ expiresAt: { $gt: new Date() } })
      .sort({ lastSeenAt: -1 })
      .toArray();
    const users = await usersById([...new Set(sessions.map((s) => String(s.uid)))].map(oid));
    res.json(
      sessions
        .filter((s) => users.has(String(s.uid)) && (users.get(String(s.uid)).sessionVersion ?? 0) === s.sv)
        .map((s) => {
          const u = users.get(String(s.uid));
          return {
            id: s._id,
            current: s._id === req.sessionId,
            user: { id: String(u._id), name: u.name, email: u.email, role: u.role },
            ip: s.ip,
            ua: s.ua,
            remember: s.remember,
            createdAt: s.createdAt,
            lastSeenAt: s.lastSeenAt,
            expiresAt: s.expiresAt,
          };
        }),
    );
  }),
);

devRoutes.delete(
  "/sessions/:id",
  h(async (req, res) => {
    const session = await col.sessions.findOne({ _id: String(req.params.id) });
    if (!session) return bad(res, "Session introuvable.", 404);
    await col.sessions.deleteOne({ _id: session._id });
    const user = await col.users.findOne({ _id: session.uid });
    await log(req, `a fermé une session de ${user?.name ?? "un compte supprimé"}`);
    res.json({ ok: true });
  }),
);

/**
 * Signs everybody out but this browser. The session version of every account goes up as well, so that
 * cookies older than the session list (or stolen) die too.
 */
devRoutes.post(
  "/sessions/revoke-all",
  h(async (req, res) => {
    const { deletedCount } = await col.sessions.deleteMany({ _id: { $ne: req.sessionId ?? null } });
    await col.users.updateMany({ _id: { $ne: req.user._id } }, { $inc: { sessionVersion: 1 } });
    await log(req, "a déconnecté tout le monde");
    console.warn(`[dev] all sessions revoked by ${req.user.email}`);
    res.json({ ok: true, closed: deletedCount });
  }),
);

devRoutes.get(
  "/logins",
  h(async (req, res) => {
    const filter = {};
    if (req.query.status === "failed") filter.ok = false;
    if (req.query.status === "ok") filter.ok = true;
    const q = str(req.query.q, 100);
    if (q) {
      const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [{ email: rx }, { ip: rx }, { name: rx }];
    }
    const limit = Math.min(Number(req.query.limit) || 200, 1000);
    const since = new Date(Date.now() - 7 * 86400 * 1000);
    const [entries, topFailedIps] = await Promise.all([
      col.logins.find(filter).sort({ at: -1 }).limit(limit).toArray(),
      col.logins
        .aggregate([
          { $match: { ok: false, at: { $gte: since } } },
          { $group: { _id: "$ip", count: { $sum: 1 }, last: { $max: "$at" }, emails: { $addToSet: "$email" } } },
          { $sort: { count: -1 } },
          { $limit: 8 },
        ])
        .toArray(),
    ]);
    res.json({
      entries: entries.map((e) => ({
        id: String(e._id),
        at: e.at,
        email: e.email,
        name: e.name,
        ok: e.ok,
        reason: e.reason,
        ip: e.ip,
        ua: e.ua,
      })),
      topFailedIps: topFailedIps.map((t) => ({ ip: t._id, count: t.count, last: t.last, emails: t.emails.slice(0, 5) })),
    });
  }),
);

// ---------------------------------------------------------------- emergency account tools

devRoutes.get(
  "/users",
  h(async (_req, res) => {
    const [users, sessions, lastLogins] = await Promise.all([
      col.users.find().sort({ createdAt: 1 }).toArray(),
      col.sessions
        .aggregate([{ $match: { expiresAt: { $gt: new Date() } } }, { $group: { _id: { uid: "$uid", sv: "$sv" }, n: { $sum: 1 } } }])
        .toArray(),
      col.logins
        .aggregate([
          { $match: { ok: true } },
          { $sort: { at: -1 } },
          { $group: { _id: "$uid", at: { $first: "$at" }, ip: { $first: "$ip" }, ua: { $first: "$ua" } } },
        ])
        .toArray(),
    ]);
    const lastBy = new Map(lastLogins.map((l) => [String(l._id), l]));
    res.json(
      users.map((u) => ({
        ...toUser(u),
        sessions: sessions
          .filter((s) => String(s._id.uid) === String(u._id) && s._id.sv === (u.sessionVersion ?? 0))
          .reduce((n, s) => n + s.n, 0),
        lastSignIn: lastBy.get(String(u._id)) ?? null,
      })),
    );
  }),
);

const findUser = async (req, res) => {
  const user = await col.users.findOne({ _id: oid(req.params.id) });
  if (!user) bad(res, "Compte introuvable.", 404);
  return user;
};

devRoutes.post(
  "/users/:id/disable",
  h(async (req, res) => {
    const user = await findUser(req, res);
    if (!user) return;
    if (String(user._id) === String(req.user._id)) return bad(res, "Vous ne pouvez pas suspendre votre propre compte.");
    const disabled = Boolean(req.body?.disabled);
    await col.users.updateOne({ _id: user._id }, disabled ? { $set: { disabled: true } } : { $unset: { disabled: "" } });
    if (disabled) await col.sessions.deleteMany({ uid: user._id });
    await log(req, `a ${disabled ? "suspendu" : "réactivé"} le compte de ${user.name}`);
    res.json({ ok: true, disabled });
  }),
);

devRoutes.post(
  "/users/:id/revoke-sessions",
  h(async (req, res) => {
    const user = await findUser(req, res);
    if (!user) return;
    const self = String(user._id) === String(req.user._id);
    const { deletedCount } = await col.sessions.deleteMany({ uid: user._id, ...(self && { _id: { $ne: req.sessionId ?? null } }) });
    if (!self) await col.users.updateOne({ _id: user._id }, { $inc: { sessionVersion: 1 } });
    await log(req, `a déconnecté ${self ? "ses autres sessions" : `toutes les sessions de ${user.name}`}`);
    res.json({ ok: true, closed: deletedCount });
  }),
);

/**
 * Reset link shown to the developer instead of being e-mailed: to pass on by phone or SMS when the
 * owner lost access to the mailbox, or when e-mails do not leave. Valid 24 h, once.
 */
devRoutes.post(
  "/users/:id/reset-link",
  h(async (req, res) => {
    const user = await findUser(req, res);
    if (!user) return;
    const token = crypto.randomBytes(32).toString("base64url");
    const expires = new Date(Date.now() + 24 * 3600 * 1000);
    await col.users.updateOne({ _id: user._id }, { $set: { resetTokenHash: sha256(token), resetExpires: expires } });
    await log(req, `a créé un lien de réinitialisation du mot de passe de ${user.name}`);
    res.json({ link: `${config.publicUrl}/admin/reinitialiser?token=${token}`, expires });
  }),
);

// ---------------------------------------------------------------- backups

devRoutes.get(
  "/backups",
  h(async (_req, res) => {
    const [history, restorePoints, schedule] = await Promise.all([
      col.backups.find().sort({ at: -1 }).limit(60).toArray(),
      listRestorePoints(),
      backupSchedule(),
    ]);
    res.json({
      mailEnabled,
      schedule,
      history: history.map(({ _id, ...b }) => ({ id: String(_id), ...b })),
      restorePoints,
    });
  }),
);

devRoutes.post(
  "/backups/send",
  rateLimit({ windowMs: 15 * 60 * 1000, max: 6 }),
  h(async (req, res) => {
    if (!mailEnabled) return bad(res, "L'envoi d'e-mails n'est pas configuré (RESEND_API_KEY).");
    const to = isEmail(req.body?.to) ? req.body.to : (config.backup?.to ?? req.user.email);
    const photos = Boolean(req.body?.photos);
    await runBackup({ photos, trigger: "manual", by: req.user.name, to });
    await log(req, `a envoyé une sauvegarde${photos ? " complète" : ""} par e-mail`);
    res.json({ ok: true, to });
  }),
);

devRoutes.get(
  "/backups/download",
  h(async (req, res) => {
    const kind = ["data", "photos", "full"].includes(req.query.kind) ? req.query.kind : "data";
    const { filename, buffer } = await backupFile(kind, req.user.name);
    await log(req, `a téléchargé une sauvegarde (${{ data: "données", photos: "photos", full: "complète" }[kind]})`);
    res.setHeader("Content-Type", "application/gzip");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Cache-Control", "no-store");
    res.send(buffer);
  }),
);

/** inspectDump, with an unreadable file answered as a 400 (its message says what is wrong). */
async function inspectUpload(req, res) {
  if (!req.file) return bad(res, "Aucun fichier reçu.");
  try {
    return await inspectDump(req.file.buffer);
  } catch (err) {
    bad(res, err.message);
    return null;
  }
}

devRoutes.post(
  "/backups/inspect",
  backupUpload,
  h(async (req, res) => {
    const inspection = await inspectUpload(req, res);
    if (inspection) res.json({ filename: req.file.originalname, ...inspection });
  }),
);

/** Restores an uploaded backup, after a restore point of the current data (to undo it). */
devRoutes.post(
  "/backups/restore",
  backupUpload,
  h(async (req, res) => {
    // Refuses a broken file before anything is touched.
    if (!(await inspectUpload(req, res))) return;
    const keepUsers = req.body?.keepUsers !== "false";
    const point = await createRestorePoint(`Avant restauration de ${req.file.originalname}`, req.user.name);
    const report = await restoreDump(req.file.buffer, { keepUsers });
    await log(req, `a restauré la sauvegarde ${req.file.originalname}`);
    console.warn(`[dev] backup ${req.file.originalname} restored by ${req.user.email}`);
    res.json({ ok: true, restorePoint: point, report });
  }),
);

devRoutes.post(
  "/restore-points",
  h(async (req, res) => {
    const id = await createRestorePoint(str(req.body?.label, 120) || "Point de restauration manuel", req.user.name);
    res.status(201).json({ id });
  }),
);

devRoutes.get(
  "/restore-points/:id/download",
  h(async (req, res) => {
    const point = await readRestorePoint(req.params.id);
    if (!point) return bad(res, "Point de restauration introuvable.", 404);
    res.setHeader("Content-Type", "application/gzip");
    res.setHeader("Content-Disposition", `attachment; filename="${point.filename}"`);
    res.send(point.buffer);
  }),
);

devRoutes.post(
  "/restore-points/:id/restore",
  h(async (req, res) => {
    const point = await readRestorePoint(req.params.id);
    if (!point) return bad(res, "Point de restauration introuvable.", 404);
    const keepUsers = req.body?.keepUsers !== false;
    const backup = await createRestorePoint(`Avant retour au point du ${point.filename}`, req.user.name);
    const report = await restoreDump(point.buffer, { keepUsers });
    await log(req, "a rétabli un point de restauration");
    res.json({ ok: true, restorePoint: backup, report });
  }),
);

devRoutes.delete(
  "/restore-points/:id",
  h(async (req, res) => {
    await deleteRestorePoint(req.params.id);
    res.json({ ok: true });
  }),
);

// ---------------------------------------------------------------- server log & tools

devRoutes.get("/logs", (req, res) => {
  res.json(recentLogs({ level: str(req.query.level, 10), after: Number(req.query.after) || 0 }));
});

devRoutes.post(
  "/tools/test-mail",
  rateLimit({ windowMs: 15 * 60 * 1000, max: 10 }),
  h(async (req, res) => {
    if (!mailEnabled) return bad(res, "L'envoi d'e-mails n'est pas configuré (RESEND_API_KEY).");
    const to = isEmail(req.body?.to) ? req.body.to : req.user.email;
    const t0 = Date.now();
    await send({
      to,
      subject: "[Test technique] Manoir de la Champagne",
      text: `E-mail de test envoyé depuis l'espace développeur par ${req.user.name}.\n\nExpéditeur : ${config.mail.from}\nServeur : ${os.hostname()}\nDate : ${new Date().toISOString()}\n`,
    });
    res.json({ ok: true, to, ms: Date.now() - t0 });
  }),
);

devRoutes.post(
  "/tools/ical-sync",
  h(async (_req, res) => res.json({ report: await syncIcal() })),
);

/** Count of documents the public site needs, to spot an empty or half-restored database. */
devRoutes.get(
  "/tools/check",
  h(async (_req, res) => {
    const checks = [];
    const add = (label, ok, detail) => checks.push({ label, ok, detail });
    const [users, admins, photos, pricing, site] = await Promise.all([
      col.users.countDocuments({ passwordHash: { $exists: true }, disabled: { $ne: true } }),
      col.users.countDocuments({ role: { $in: ["admin", "developer"] }, passwordHash: { $exists: true }, disabled: { $ne: true } }),
      col.photos.find({ url: /^\/uploads\// }, { projection: { url: 1, key: 1 } }).toArray(),
      getSetting("pricing", null),
      getSetting("site", contentSchema.settings),
    ]);
    const ids = photos.map((p) => oid(p.url.slice("/uploads/".length))).filter(Boolean);
    const present = new Set(
      (
        await client
          .db(config.mongoDb)
          .collection("uploads.files")
          .find({ _id: { $in: ids } }, { projection: { _id: 1 } })
          .toArray()
      ).map((f) => String(f._id)),
    );
    const broken = photos.filter((p) => !present.has(p.url.slice("/uploads/".length)));
    add("Comptes actifs", users > 0, `${users} compte(s) avec mot de passe`);
    add("Administrateur joignable", admins > 0, `${admins} administrateur(s) ou développeur(s) actif(s)`);
    add(
      "Photos envoyées présentes en base",
      broken.length === 0,
      broken.length
        ? `${broken.length} photo(s) sans fichier : ${broken
            .slice(0, 5)
            .map((p) => p.key ?? p.url)
            .join(", ")}`
        : `${photos.length} photo(s) vérifiée(s)`,
    );
    add("Grille tarifaire", Boolean(pricing), pricing ? "présente" : "absente");
    add("Coordonnées", Boolean(site?.phone && site?.address), site?.phone ? `${site.phone}` : "téléphone manquant");
    add("E-mails", mailEnabled, mailEnabled ? `expéditeur ${config.mail.from}` : "RESEND_API_KEY absente");
    add("Destinataire des demandes", Boolean(config.mail?.to), config.mail?.to ?? "NOTIFY_EMAIL absente");
    add(
      "Sauvegarde automatique",
      Boolean(config.backup && mailEnabled),
      config.backup ? `vers ${config.backup.to}` : "BACKUP_DB_MAIL absente",
    );
    add(
      "Secret de session",
      Boolean(process.env.SESSION_SECRET),
      process.env.SESSION_SECRET ? "défini" : "aléatoire : les sessions tombent à chaque redémarrage",
    );
    res.json(checks);
  }),
);
