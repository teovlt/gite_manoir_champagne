import crypto from "node:crypto";
import express from "express";
import { config, LANGS } from "../config.js";
import { col, contentSchema, getSetting, logActivity, setSetting } from "../db.js";
import { hashPassword, rateLimit, setSessionCookie, sha256, verifyPassword } from "../auth.js";
import { removeImage, storeImage, upload } from "../files.js";
import { exportToken, exportUrl, findConflicts, ignoreConflict, syncIcal } from "../ical.js";
import { mailEnabled, send, sendEmailChange, sendInvitation } from "../mail.js";
import { BODY_MAX, MAIL_TEMPLATES, SUBJECT_MAX, listTemplates, renderMail, sampleVars, saveTemplate } from "../mail-templates.js";
import { MIN_PASSWORD, sendResetLink, sessionUser } from "./auth.js";
import { currentBanner, contentOverrides } from "./public.js";
import { bad, h, isDate, isEmail, isSafeLink, oid, overlapQuery, str, toEvent, toPhoto, toUser, today, translated } from "./helpers.js";

export const adminRoutes = express.Router();

const SECTIONS = ["accueil", "gite", "jardins", "region"];
const ROLES = ["admin", "editor"];
const REQUEST_STATUSES = ["nouvelle", "repondue", "confirmee", "refusee"];

adminRoutes.use(
  h(async (req, res, next) => {
    const user = await sessionUser(req);
    if (!user) return bad(res, "Session expirée, reconnectez-vous.", 401);
    req.user = user;
    next();
  }),
);

const requireAdmin = (req, res, next) => (req.user.role === "admin" ? next() : bad(res, "Réservé aux administrateurs.", 403));
const who = (req) => req.user.name.split(" ")[0];
const log = (req, message) => logActivity(who(req), message);

const toRequest = (r) => ({ ...r, id: String(r._id), _id: undefined });

// ---------------------------------------------------------------- dashboard

adminRoutes.get(
  "/dashboard",
  h(async (_req, res) => {
    const yearStart = new Date(new Date().getFullYear(), 0, 1);
    const [activeEvents, banner, requestsThisYear, newRequests, lastActivity, activity, requests, upcoming, conflicts] = await Promise.all([
      col.events.countDocuments({ active: true, endDate: { $gte: today() } }),
      currentBanner(),
      col.requests.countDocuments({ createdAt: { $gte: yearStart } }),
      col.requests.countDocuments({ status: "nouvelle" }),
      col.activity.find().sort({ createdAt: -1 }).limit(1).next(),
      col.activity.find().sort({ createdAt: -1 }).limit(8).toArray(),
      col.requests.find().sort({ createdAt: -1 }).limit(6).toArray(),
      col.availability
        .find({ end: { $gt: today() } })
        .sort({ start: 1 })
        .limit(4)
        .toArray(),
      findConflicts(),
    ]);
    res.json({
      stats: {
        pages: contentSchema.pages.length,
        activeEvents,
        bannerTitle: banner?.title?.fr ?? null,
        requestsThisYear,
        newRequests,
        lastChange: lastActivity ? { at: lastActivity.createdAt, by: lastActivity.userName } : null,
      },
      activity: activity.map((a) => ({ id: String(a._id), userName: a.userName, message: a.message, createdAt: a.createdAt })),
      requests: requests.map(toRequest),
      upcoming: upcoming.map((b) => ({ id: String(b._id), start: b.start, end: b.end, label: b.label, source: b.source })),
      conflicts,
    });
  }),
);

// ---------------------------------------------------------------- booking requests

adminRoutes.get(
  "/requests",
  h(async (req, res) => {
    const filter = REQUEST_STATUSES.includes(req.query.status) ? { status: req.query.status } : {};
    res.json((await col.requests.find(filter).sort({ createdAt: -1 }).limit(500).toArray()).map(toRequest));
  }),
);

adminRoutes.patch(
  "/requests/:id",
  h(async (req, res) => {
    const request = await col.requests.findOne({ _id: oid(req.params.id) });
    if (!request) return bad(res, "Demande introuvable.", 404);
    const status = req.body?.status;
    if (!REQUEST_STATUSES.includes(status)) return bad(res, "Statut inconnu.");
    if (status === "confirmee" && request.kind === "question") return bad(res, "Une question ne se confirme pas comme un séjour.");
    const note = req.body?.note !== undefined ? str(req.body.note, 2000) : request.note;

    // Confirming a request with real dates blocks them in the calendar (and refusing/reopening frees them).
    if (status === "confirmee" && request.arrival && request.departure && !request.blockId) {
      const clash = await col.availability.findOne(overlapQuery(request.arrival, request.departure));
      if (clash) return bad(res, `Ces dates chevauchent déjà « ${clash.label} » dans le calendrier.`, 409);
      const { insertedId } = await col.availability.insertOne({
        start: request.arrival,
        end: request.departure,
        label: `Séjour ${request.name}`,
        source: "request",
        requestId: request._id,
        createdAt: new Date(),
      });
      request.blockId = insertedId;
    }
    if (status !== "confirmee" && request.blockId) {
      await col.availability.deleteOne({ _id: request.blockId });
      request.blockId = null;
    }

    await col.requests.updateOne({ _id: request._id }, { $set: { status, note, blockId: request.blockId ?? null } });
    if (status !== request.status) {
      const labels = { nouvelle: "rouvert", repondue: "marqué comme répondue", confirmee: "confirmé", refusee: "refusé" };
      await log(req, `a ${labels[status]} ${request.kind === "question" ? "la question" : "la demande"} de ${request.name}`);
    }
    res.json({ ok: true });
  }),
);

adminRoutes.delete(
  "/requests/:id",
  h(async (req, res) => {
    const request = await col.requests.findOneAndDelete({ _id: oid(req.params.id) });
    if (request?.blockId) await col.availability.deleteOne({ _id: request.blockId });
    if (request) await log(req, `a supprimé la demande de ${request.name}`);
    res.json({ ok: true });
  }),
);

// ---------------------------------------------------------------- content

adminRoutes.get(
  "/content",
  h(async (_req, res) => {
    res.json({ values: await contentOverrides(), navLinks: await getSetting("navLinks", contentSchema.navLinks) });
  }),
);

adminRoutes.put(
  "/content/:page",
  h(async (req, res) => {
    const page = contentSchema.pages.find((p) => p.id === req.params.page);
    const lang = req.body?.lang;
    if (!page) return bad(res, "Page inconnue.", 404);
    if (!LANGS.includes(lang)) return bad(res, "Langue inconnue.");
    const defaults = new Map(page.sections.flatMap((s) => s.fields.map((f) => [f.key, f.value?.[lang] ?? ""])));
    // Only the fields sent are touched. A text equal to the default (or emptied) drops the override,
    // so later updates of the default texts keep reaching the site.
    const ops = Object.entries(req.body?.values ?? {})
      .filter(([key, value]) => defaults.has(key) && typeof value === "string")
      .map(([key, value]) => {
        const filter = { page: page.id, key, lang };
        const text = value.slice(0, 20000);
        if (!text.trim() || text.trim() === defaults.get(key).trim()) return { deleteOne: { filter } };
        return { updateOne: { filter, update: { $set: { value: text, updatedAt: new Date(), updatedBy: who(req) } }, upsert: true } };
      });
    if (ops.length) await col.content.bulkWrite(ops);
    if (ops.length) await log(req, `a modifié le texte de la page ${page.label} (${lang.toUpperCase()})`);
    res.json({ ok: true });
  }),
);

adminRoutes.put(
  "/nav-links",
  h(async (req, res) => {
    const links = Array.isArray(req.body?.links) ? req.body.links : null;
    if (!links || links.length > 12) return bad(res, "Liste de liens invalide.");
    const clean = links.map((l) => ({ label: translated(l.label, 60), href: str(l.href, 300) })).filter((l) => l.label.fr && l.href);
    if (clean.some((l) => !isSafeLink(l.href))) return bad(res, "Les liens doivent commencer par /, # ou https://");
    await setSetting("navLinks", clean);
    await log(req, "a mis à jour les liens du pied de page");
    res.json({ ok: true, links: clean });
  }),
);

// ---------------------------------------------------------------- site settings (contact, map)

adminRoutes.get(
  "/settings",
  h(async (_req, res) => res.json(await getSetting("site", contentSchema.settings))),
);

adminRoutes.put(
  "/settings",
  h(async (req, res) => {
    const b = req.body ?? {};
    const lat = Number(b.location?.lat);
    const lng = Number(b.location?.lng);
    const zoom = Number(b.location?.zoom ?? 14);
    if (!(lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180)) return bad(res, "Coordonnées GPS invalides.");
    const abritelUrl = str(b.abritelUrl, 500);
    if (abritelUrl && !/^https?:\/\//.test(abritelUrl)) return bad(res, "Le lien Abritel doit commencer par https://");
    const value = {
      phone: str(b.phone, 40),
      address: str(b.address, 200),
      abritelUrl,
      location: { lat, lng, zoom: Math.min(18, Math.max(5, Math.round(zoom))) },
    };
    await setSetting("site", value);
    await log(req, "a mis à jour les paramètres du site (coordonnées, carte)");
    res.json(value);
  }),
);

// ---------------------------------------------------------------- photos

adminRoutes.get(
  "/photos",
  h(async (_req, res) => res.json((await col.photos.find().sort({ sort: 1, _id: 1 }).toArray()).map(toPhoto))),
);

const altFromName = (name) => {
  const base = name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ");
  return { fr: base, en: base, de: base };
};

adminRoutes.post(
  "/photos",
  upload.array("files"),
  h(async (req, res) => {
    const section = SECTIONS.includes(req.body?.section) ? req.body.section : "accueil";
    if (!req.files?.length) return bad(res, "Aucune image valide (JPG, PNG ou WebP, 15 Mo max).");
    const last = await col.photos.find().sort({ sort: -1 }).limit(1).next();
    let sort = (last?.sort ?? 0) + 1;
    for (const file of req.files) {
      const url = await storeImage(file);
      await col.photos.insertOne({ key: null, section, alt: altFromName(file.originalname), url, sort: sort++, createdAt: new Date() });
    }
    await log(req, `a ajouté ${req.files.length} photo${req.files.length > 1 ? "s" : ""}`);
    res.status(201).json({ ok: true });
  }),
);

adminRoutes.put(
  "/photos/:id/file",
  upload.single("file"),
  h(async (req, res) => {
    const photo = await col.photos.findOne({ _id: oid(req.params.id) });
    if (!photo) return bad(res, "Photo introuvable.", 404);
    if (!req.file) return bad(res, "Image invalide (JPG, PNG ou WebP, 15 Mo max).");
    const url = await storeImage(req.file);
    await removeImage(photo.url);
    await col.photos.updateOne({ _id: photo._id }, { $set: { url } });
    await log(req, `a remplacé la photo « ${photo.alt.fr} »`);
    res.json({ ok: true, url });
  }),
);

adminRoutes.patch(
  "/photos/:id",
  h(async (req, res) => {
    const photo = await col.photos.findOne({ _id: oid(req.params.id) });
    if (!photo) return bad(res, "Photo introuvable.", 404);
    const update = {};
    if (req.body?.alt && typeof req.body.alt === "object") {
      update.alt = { ...photo.alt };
      for (const lang of LANGS) if (typeof req.body.alt[lang] === "string") update.alt[lang] = str(req.body.alt[lang], 200);
    }
    // Slot photos stay in their page; free gallery photos can move between sections.
    if (!photo.key && SECTIONS.includes(req.body?.section)) update.section = req.body.section;
    if (Number.isInteger(req.body?.sort)) update.sort = req.body.sort;
    await col.photos.updateOne({ _id: photo._id }, { $set: update });
    res.json({ ok: true });
  }),
);

adminRoutes.delete(
  "/photos/:id",
  h(async (req, res) => {
    const photo = await col.photos.findOne({ _id: oid(req.params.id) });
    if (!photo) return bad(res, "Photo introuvable.", 404);
    await removeImage(photo.url);
    // A slot keeps its place on the page and falls back to a placeholder.
    if (photo.key) await col.photos.updateOne({ _id: photo._id }, { $set: { url: null } });
    else await col.photos.deleteOne({ _id: photo._id });
    await log(req, `a retiré la photo « ${photo.alt.fr} »`);
    res.json({ ok: true });
  }),
);

// ---------------------------------------------------------------- events & banner

adminRoutes.get(
  "/events",
  h(async (_req, res) => {
    const [bannerEnabled, events] = await Promise.all([
      getSetting("bannerEnabled", true),
      col.events.find().sort({ startDate: -1, _id: -1 }).toArray(),
    ]);
    res.json({ bannerEnabled, events: events.map(toEvent) });
  }),
);

function parseEvent(body) {
  const e = {
    title: translated(body?.title, 120),
    text: translated(body?.text, 200),
    startDate: body?.startDate,
    endDate: body?.endDate,
    link: str(body?.link, 300),
    active: Boolean(body?.active),
  };
  if (!e.title.fr) return { error: "Le titre (en français) est obligatoire." };
  if (!isDate(e.startDate) || !isDate(e.endDate)) return { error: "Dates de début et de fin obligatoires." };
  if (e.endDate < e.startDate) return { error: "La fin doit être après le début." };
  if (e.link && !isSafeLink(e.link)) return { error: "Lien invalide." };
  return { event: e };
}

adminRoutes.post(
  "/events",
  h(async (req, res) => {
    const { event, error } = parseEvent(req.body);
    if (error) return bad(res, error);
    await col.events.insertOne({ ...event, createdAt: new Date() });
    await log(req, `a ajouté l'événement « ${event.title.fr} »`);
    res.status(201).json({ ok: true });
  }),
);

adminRoutes.put(
  "/events/:id",
  h(async (req, res) => {
    const existing = await col.events.findOne({ _id: oid(req.params.id) });
    if (!existing) return bad(res, "Événement introuvable.", 404);
    const { event, error } = parseEvent(req.body);
    if (error) return bad(res, error);
    await col.events.updateOne({ _id: existing._id }, { $set: event });
    const verb = existing.active !== event.active ? (event.active ? "a activé" : "a désactivé") : "a modifié";
    await log(req, `${verb} l'événement « ${event.title.fr} »`);
    res.json({ ok: true });
  }),
);

adminRoutes.delete(
  "/events/:id",
  h(async (req, res) => {
    const existing = await col.events.findOneAndDelete({ _id: oid(req.params.id) });
    if (!existing) return bad(res, "Événement introuvable.", 404);
    await log(req, `a supprimé l'événement « ${existing.title.fr} »`);
    res.json({ ok: true });
  }),
);

adminRoutes.put(
  "/banner",
  h(async (req, res) => {
    const enabled = Boolean(req.body?.enabled);
    await setSetting("bannerEnabled", enabled);
    await log(req, enabled ? "a affiché la bannière d'événements" : "a masqué la bannière d'événements");
    res.json({ ok: true, enabled });
  }),
);

// ---------------------------------------------------------------- pricing

adminRoutes.get(
  "/pricing",
  h(async (_req, res) => res.json(await getSetting("pricing"))),
);

const price = (v) => {
  const n = Number(String(v).replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) && n >= 0 && n < 100000 ? Math.round(n * 100) / 100 : null;
};

adminRoutes.put(
  "/pricing",
  h(async (req, res) => {
    const current = await getSetting("pricing");
    const byId = (list) => new Map((Array.isArray(list) ? list : []).map((x) => [x.id, x]));
    const formulas = byId(req.body?.formulas);
    const seasons = byId(req.body?.seasons);
    const extras = byId(req.body?.extras);

    const next = {
      formulas: current.formulas.map((f) => {
        const u = formulas.get(f.id);
        return { ...f, low: (u && price(u.low)) ?? f.low, high: (u && price(u.high)) ?? f.high };
      }),
      seasons: current.seasons.map((s) => (seasons.has(s.id) ? { ...s, periods: translated(seasons.get(s.id).periods, 200) } : s)),
      extras: current.extras.map((x) => {
        const p = extras.has(x.id) ? price(extras.get(x.id).price) : null;
        return { ...x, price: p ?? x.price };
      }),
    };
    if (next.formulas.some((f) => f.low > f.high)) return bad(res, "Le prix bas doit être inférieur ou égal au prix haut.");

    const changes = [];
    next.formulas.forEach((f, i) => {
      const o = current.formulas[i];
      if (o.low !== f.low || o.high !== f.high) changes.push(`${f.name.fr} ${o.low}–${o.high} → ${f.low}–${f.high} €`);
    });
    next.extras.forEach((x, i) => {
      if (current.extras[i].price !== x.price) changes.push(`${x.label.fr} ${current.extras[i].price} → ${x.price} €`);
    });
    await setSetting("pricing", next);
    await col.settings.updateOne(
      { _id: "pricingHistory" },
      { $push: { value: { $each: [{ at: new Date(), by: who(req), changes }], $slice: -200 } } },
      { upsert: true },
    );
    await log(req, changes.length ? `a mis à jour les tarifs (${changes.join(" ; ")})` : "a mis à jour les périodes de saison");
    res.json(next);
  }),
);

// ---------------------------------------------------------------- availability calendar

adminRoutes.get(
  "/availability",
  h(async (_req, res) => {
    const from = new Date(Date.now() - 60 * 86400000).toISOString().slice(0, 10);
    const [blocks, icalUrls, lastSync, token, conflicts] = await Promise.all([
      col.availability
        .find({ end: { $gte: from } })
        .sort({ start: 1 })
        .toArray(),
      getSetting("icalUrls", []),
      getSetting("icalLastSync", null),
      exportToken(),
      findConflicts(),
    ]);
    res.json({
      blocks: blocks.map((b) => ({
        id: String(b._id),
        start: b.start,
        end: b.end,
        label: b.label,
        source: b.source,
        feed: b.feed ?? null,
      })),
      icalUrls,
      lastSync,
      exportUrl: exportUrl(token),
      conflicts,
    });
  }),
);

adminRoutes.post(
  "/availability",
  h(async (req, res) => {
    const start = req.body?.start;
    const end = req.body?.end;
    if (!isDate(start) || !isDate(end) || end <= start) return bad(res, "Indiquez une date d'arrivée et une date de départ postérieure.");
    const clash = await col.availability.findOne(overlapQuery(start, end));
    if (clash) return bad(res, `Chevauche « ${clash.label} » (${clash.start} → ${clash.end}).`, 409);
    const label = str(req.body?.label, 120) || "Réservé";
    await col.availability.insertOne({ start, end, label, source: "manual", createdAt: new Date() });
    await log(req, `a bloqué ${start} → ${end} dans le calendrier (${label})`);
    res.status(201).json({ ok: true });
  }),
);

adminRoutes.delete(
  "/availability/:id",
  h(async (req, res) => {
    const block = await col.availability.findOne({ _id: oid(req.params.id) });
    if (!block) return bad(res, "Période introuvable.", 404);
    if (block.source === "ical") return bad(res, "Cette période vient d'un calendrier externe : modifiez-la à la source.");
    await col.availability.deleteOne({ _id: block._id });
    if (block.requestId) await col.requests.updateOne({ _id: block.requestId }, { $set: { blockId: null, status: "repondue" } });
    await log(req, `a libéré ${block.start} → ${block.end} dans le calendrier`);
    res.json({ ok: true });
  }),
);

adminRoutes.put(
  "/availability/ical",
  h(async (req, res) => {
    const urls = (Array.isArray(req.body?.urls) ? req.body.urls : []).map((u) => str(u, 1000)).filter(Boolean);
    if (urls.length > 5) return bad(res, "5 calendriers maximum.");
    if (urls.some((u) => !/^https?:\/\//.test(u))) return bad(res, "Chaque lien iCal doit commencer par https://");
    const removed = (await getSetting("icalUrls", [])).filter((u) => !urls.includes(u));
    if (removed.length) await col.availability.deleteMany({ source: "ical", feed: { $in: removed } });
    await setSetting("icalUrls", urls);
    const report = await syncIcal();
    await log(req, "a mis à jour les calendriers synchronisés");
    res.json({ ok: true, report });
  }),
);

adminRoutes.post(
  "/availability/conflicts/ignore",
  h(async (req, res) => {
    const key = str(req.body?.key, 300);
    if (!(await ignoreConflict(key))) return bad(res, "Ce chevauchement n'existe plus.", 404);
    await log(req, "a marqué un chevauchement de calendrier comme vérifié");
    res.json({ ok: true });
  }),
);

adminRoutes.post(
  "/availability/export-link",
  h(async (req, res) => {
    const token = await exportToken({ renew: true });
    await log(req, "a régénéré le lien d'export du calendrier");
    res.json({ exportUrl: exportUrl(token) });
  }),
);

adminRoutes.post(
  "/availability/sync",
  h(async (_req, res) => res.json({ report: await syncIcal() })),
);

// ---------------------------------------------------------------- account & users

const tooShort = (password) => String(password).length < MIN_PASSWORD;
const pwdError = `Le mot de passe doit faire au moins ${MIN_PASSWORD} caractères.`;
const emailTaken = async (email, exceptId) => Boolean(await col.users.findOne({ email, _id: { $ne: exceptId } }));
const mailOff = "L'envoi d'e-mails n'est pas configuré (RESEND_API_KEY).";
const EMAIL_PENDING_FIELDS = { pendingEmail: "", emailTokenHash: "", emailExpires: "" };

/** Applies $set/$unset to a user document and returns the updated copy. */
async function updateUser(user, set, unset) {
  await col.users.updateOne({ _id: user._id }, { $set: set, ...(Object.keys(unset).length && { $unset: unset }) });
  const updated = { ...user, ...set };
  for (const k of Object.keys(unset)) delete updated[k];
  return updated;
}

adminRoutes.get("/mail-status", (_req, res) => res.json({ enabled: mailEnabled }));

/** Own profile: name, e-mail (confirmed through the new address when e-mails work) and password. */
adminRoutes.put(
  "/me",
  h(async (req, res) => {
    const me = req.user;
    const name = str(req.body?.name, 80);
    const email = req.body?.email !== undefined ? str(req.body.email, 200).toLowerCase() : me.email;
    const changingEmail = email !== me.email;
    const changingPassword = req.body?.newPassword !== undefined;
    const set = {};
    const unset = {};
    let emailPending = false;

    if (name) set.name = name;
    if ((changingEmail || changingPassword) && !(await verifyPassword(String(req.body.currentPassword ?? ""), me.passwordHash)))
      return bad(res, "Mot de passe actuel incorrect.");
    if (changingEmail) {
      if (!isEmail(email)) return bad(res, "Adresse e-mail invalide.");
      if (await emailTaken(email, me._id)) return bad(res, "Un autre compte utilise déjà cette adresse.", 409);
      if (mailEnabled) {
        const token = crypto.randomBytes(32).toString("base64url");
        Object.assign(set, { pendingEmail: email, emailTokenHash: sha256(token), emailExpires: new Date(Date.now() + 86400 * 1000) });
        sendEmailChange({ ...me, ...set }, email, token).catch((err) => console.error("[mail]", err.message));
        emailPending = true;
      } else {
        set.email = email;
        Object.assign(unset, EMAIL_PENDING_FIELDS);
      }
    }
    if (changingPassword) {
      if (tooShort(req.body.newPassword)) return bad(res, `Le nouveau mot de passe doit faire au moins ${MIN_PASSWORD} caractères.`);
      set.passwordHash = await hashPassword(String(req.body.newPassword));
      set.sessionVersion = (me.sessionVersion ?? 0) + 1;
    }
    const user = await updateUser(me, set, unset);
    if (set.sessionVersion) setSessionCookie(res, user, false); // keep this browser signed in
    if (set.email) await log(req, "a changé son adresse e-mail de connexion");
    res.json({ ...toUser(user), emailPending });
  }),
);

adminRoutes.delete(
  "/me/pending-email",
  h(async (req, res) => res.json(toUser(await updateUser(req.user, {}, EMAIL_PENDING_FIELDS)))),
);

/** Sends the signed-in user a password reset link. */
adminRoutes.post(
  "/me/password-link",
  rateLimit({ windowMs: 15 * 60 * 1000, max: 5 }),
  h(async (req, res) => {
    if (!mailEnabled) return bad(res, mailOff);
    await sendResetLink(req.user);
    res.json({ ok: true, email: req.user.email });
  }),
);

adminRoutes.get(
  "/users",
  requireAdmin,
  h(async (_req, res) => res.json((await col.users.find().sort({ createdAt: 1 }).toArray()).map(toUser))),
);

adminRoutes.post(
  "/users",
  requireAdmin,
  h(async (req, res) => {
    const email = str(req.body?.email, 200).toLowerCase();
    const name = str(req.body?.name, 80);
    const role = ROLES.includes(req.body?.role) ? req.body.role : "editor";
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    if (!isEmail(email) || !name) return bad(res, "Nom et e-mail valides requis.");
    if (password && tooShort(password)) return bad(res, pwdError);
    if (!password && !mailEnabled) return bad(res, "L'envoi d'e-mails n'est pas configuré : indiquez un mot de passe provisoire.");
    if (await col.users.findOne({ email })) return bad(res, "Un compte existe déjà avec cet e-mail.", 409);

    const doc = { email, name, role, createdAt: new Date(), sessionVersion: 0 };
    let token;
    if (password) doc.passwordHash = await hashPassword(password);
    else {
      token = crypto.randomBytes(32).toString("base64url");
      doc.resetTokenHash = sha256(token);
      doc.resetExpires = new Date(Date.now() + 7 * 86400 * 1000);
    }
    const { insertedId } = await col.users.insertOne(doc);
    if (token) sendInvitation(doc, token, req.user.name).catch((err) => console.error("[mail]", err.message));
    await log(req, `a créé le compte de ${name} (${role === "admin" ? "administrateur" : "éditeur"})`);
    res.status(201).json(toUser({ ...doc, _id: insertedId }));
  }),
);

adminRoutes.patch(
  "/users/:id",
  requireAdmin,
  h(async (req, res) => {
    const user = await col.users.findOne({ _id: oid(req.params.id) });
    if (!user) return bad(res, "Compte introuvable.", 404);
    const set = {};
    const unset = {};
    const changes = [];
    const name = str(req.body?.name, 80);
    if (name && name !== user.name) {
      set.name = name;
      changes.push("nom");
    }
    if (req.body?.email !== undefined) {
      const email = str(req.body.email, 200).toLowerCase();
      if (email !== user.email) {
        if (!isEmail(email)) return bad(res, "Adresse e-mail invalide.");
        if (await emailTaken(email, user._id)) return bad(res, "Un autre compte utilise déjà cette adresse.", 409);
        set.email = email;
        Object.assign(unset, EMAIL_PENDING_FIELDS);
        changes.push("e-mail");
      }
    }
    if (ROLES.includes(req.body?.role) && req.body.role !== user.role) {
      if (user.role === "admin" && (await col.users.countDocuments({ role: "admin" })) <= 1)
        return bad(res, "Il faut garder au moins un administrateur.");
      set.role = req.body.role;
      changes.push(`rôle ${req.body.role === "admin" ? "administrateur" : "éditeur"}`);
    }
    if (req.body?.password) {
      if (tooShort(req.body.password)) return bad(res, pwdError);
      set.passwordHash = await hashPassword(String(req.body.password));
      set.sessionVersion = (user.sessionVersion ?? 0) + 1;
      Object.assign(unset, { resetTokenHash: "", resetExpires: "" });
      changes.push("mot de passe");
    }
    if (!changes.length) return res.json(toUser(user));
    const updated = await updateUser(user, set, unset);
    // Changing one's own password here must not sign this browser out.
    if (String(user._id) === String(req.user._id) && set.sessionVersion) setSessionCookie(res, updated, false);
    await log(req, `a modifié le compte de ${updated.name} (${changes.join(", ")})`);
    res.json(toUser(updated));
  }),
);

/** E-mails a password reset link — or a new invitation when the account never chose a password. */
adminRoutes.post(
  "/users/:id/send-link",
  requireAdmin,
  h(async (req, res) => {
    if (!mailEnabled) return bad(res, mailOff);
    const user = await col.users.findOne({ _id: oid(req.params.id) });
    if (!user) return bad(res, "Compte introuvable.", 404);
    if (user.passwordHash) await sendResetLink(user);
    else {
      const token = crypto.randomBytes(32).toString("base64url");
      await col.users.updateOne({ _id: user._id }, { $set: { resetTokenHash: sha256(token), resetExpires: new Date(Date.now() + 7 * 86400 * 1000) } });
      await sendInvitation(user, token, req.user.name);
    }
    await log(req, `a envoyé ${user.passwordHash ? "un lien de réinitialisation du mot de passe" : "une nouvelle invitation"} à ${user.name}`);
    res.json({ ok: true, invitation: !user.passwordHash });
  }),
);

adminRoutes.delete(
  "/users/:id",
  requireAdmin,
  h(async (req, res) => {
    const user = await col.users.findOne({ _id: oid(req.params.id) });
    if (!user) return bad(res, "Compte introuvable.", 404);
    if (String(user._id) === String(req.user._id)) return bad(res, "Vous ne pouvez pas supprimer votre propre compte.");
    if (user.role === "admin" && (await col.users.countDocuments({ role: "admin" })) <= 1)
      return bad(res, "Il faut garder au moins un administrateur.");
    await col.users.deleteOne({ _id: user._id });
    await log(req, `a supprimé le compte de ${user.name}`);
    res.json({ ok: true });
  }),
);

// ---------------------------------------------------------------- e-mail templates

adminRoutes.get(
  "/mail-templates",
  requireAdmin,
  h(async (_req, res) => res.json({ mailEnabled, notifyEmail: Boolean(config.mail?.to), templates: await listTemplates() })),
);

const templateInput = (req) => {
  const tpl = MAIL_TEMPLATES[req.params.id];
  const lang = req.body?.lang ?? "fr";
  if (!tpl) return { error: "Modèle inconnu." };
  if (!tpl.langs.includes(lang)) return { error: "Langue non disponible pour ce modèle." };
  const subject = typeof req.body?.subject === "string" ? req.body.subject.slice(0, SUBJECT_MAX) : "";
  const body = typeof req.body?.body === "string" ? req.body.body.slice(0, BODY_MAX) : "";
  return { tpl, lang, subject, body };
};

adminRoutes.put(
  "/mail-templates/:id",
  requireAdmin,
  h(async (req, res) => {
    const { tpl, lang, subject, body, error } = templateInput(req);
    if (error) return bad(res, error);
    await saveTemplate(req.params.id, lang, subject, body);
    await log(req, `a modifié le modèle d'e-mail « ${tpl.label} »${tpl.langs.length > 1 ? ` (${lang.toUpperCase()})` : ""}`);
    res.json((await listTemplates()).find((t) => t.id === req.params.id));
  }),
);

/** The draft as an e-mail: subject, text and branded HTML, filled with example values. */
const draftMail = ({ tpl, lang, subject, body }, id) => {
  const def = tpl.defaults[lang];
  return renderMail(subject.trim() || def.subject, body.trim() ? body : def.body, sampleVars(id), lang);
};

adminRoutes.post(
  "/mail-templates/:id/preview",
  requireAdmin,
  h(async (req, res) => {
    const input = templateInput(req);
    if (input.error) return bad(res, input.error);
    res.json(draftMail(input, req.params.id));
  }),
);

/** Sends the draft (saved or not) to the signed-in user, filled with example values. */
adminRoutes.post(
  "/mail-templates/:id/test",
  requireAdmin,
  rateLimit({ windowMs: 15 * 60 * 1000, max: 15 }),
  h(async (req, res) => {
    if (!mailEnabled) return bad(res, mailOff);
    const input = templateInput(req);
    if (input.error) return bad(res, input.error);
    const mail = draftMail(input, req.params.id);
    await send({ to: req.user.email, ...mail, subject: `[Test] ${mail.subject}` });
    res.json({ ok: true, email: req.user.email });
  }),
);
