import crypto from "node:crypto";
import express from "express";
import { LANGS } from "../config.js";
import { col, contentSchema, getSetting } from "../db.js";
import { rateLimit } from "../auth.js";
import { buildIcalExport, exportToken } from "../ical.js";
import { acknowledgeRequest, notifyNewRequest } from "../mail.js";
import { bad, h, isDate, isEmail, optInt, overlapQuery, str, toEvent, toPhoto, today } from "./helpers.js";

export const publicRoutes = express.Router();

export async function currentBanner() {
  if (!(await getSetting("bannerEnabled", true))) return null;
  // Shown during its period only, as the admin says ("affiché pendant la période").
  const now = today();
  const event = await col.events
    .find({ active: true, startDate: { $lte: now }, endDate: { $gte: now } })
    .sort({ startDate: -1, _id: -1 })
    .limit(1)
    .next();
  return event ? toEvent(event) : null;
}

/** Owners' text overrides, grouped as { lang: { page: { key: value } } }. */
export async function contentOverrides() {
  const out = Object.fromEntries(LANGS.map((l) => [l, {}]));
  for await (const row of col.content.find({}, { projection: { _id: 0, page: 1, key: 1, lang: 1, value: 1 } })) {
    ((out[row.lang] ??= {})[row.page] ??= {})[row.key] = row.value;
  }
  return out;
}

publicRoutes.get(
  "/site",
  h(async (_req, res) => {
    const [content, navLinks, photos, pricing, banner, site] = await Promise.all([
      contentOverrides(),
      getSetting("navLinks", contentSchema.navLinks),
      col.photos.find().sort({ sort: 1, _id: 1 }).toArray(),
      getSetting("pricing"),
      currentBanner(),
      getSetting("site", contentSchema.settings),
    ]);
    res.setHeader("Cache-Control", "no-cache");
    res.json({ content, navLinks, photos: photos.map(toPhoto), pricing, banner, settings: site });
  }),
);

/** iCal feed for Abritel / Airbnb / Booking. The token in the URL keeps it unguessable. */
publicRoutes.get(
  "/calendar/:file",
  h(async (req, res) => {
    const given = Buffer.from(String(req.params.file).replace(/.ics$/, ""));
    const expected = Buffer.from(await exportToken());
    if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return bad(res, "Not found", 404);
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("X-Robots-Tag", "noindex");
    res.type("text/calendar; charset=utf-8").send(await buildIcalExport());
  }),
);

/** Booked periods for the public calendar — no labels or personal data. */
publicRoutes.get(
  "/availability",
  h(async (_req, res) => {
    const from = today();
    const until = new Date(Date.now() + 550 * 86400000).toISOString().slice(0, 10);
    const blocks = await col.availability
      .find(overlapQuery(from, until), { projection: { _id: 0, start: 1, end: 1 } })
      .sort({ start: 1 })
      .toArray();
    res.json({ blocks });
  }),
);

publicRoutes.post(
  "/requests",
  rateLimit({ windowMs: 10 * 60 * 1000, max: 5 }),
  h(async (req, res) => {
    const b = req.body ?? {};
    if (b.website) return res.status(201).json({ ok: true }); // honeypot: silently ignore bots
    const name = str(b.name, 120);
    const email = str(b.email, 200).toLowerCase();
    if (!name || !isEmail(email)) return bad(res, "invalid_contact");
    const arrival = isDate(b.arrival) ? b.arrival : null;
    const departure = isDate(b.departure) ? b.departure : null;
    if (arrival && departure && departure <= arrival) return bad(res, "dates_order");
    if (arrival && arrival < today()) return bad(res, "dates_past");
    const adults = optInt(b.adults, 30);
    const children = optInt(b.children, 30);
    if ((adults ?? 0) + (children ?? 0) > 14) return bad(res, "capacity");
    if (arrival && departure && (await col.availability.findOne(overlapQuery(arrival, departure)))) return bad(res, "unavailable", 409);

    const request = {
      name,
      email,
      arrival,
      departure,
      dates: str(b.dates, 200) || null,
      adults,
      children,
      message: str(b.message, 4000) || null,
      lang: LANGS.includes(b.lang) ? b.lang : "fr",
      status: "nouvelle",
      createdAt: new Date(),
    };
    await col.requests.insertOne(request);
    notifyNewRequest(request).catch((err) => console.error("[mail]", err.message));
    acknowledgeRequest(request).catch((err) => console.error("[mail]", err.message));
    res.status(201).json({ ok: true });
  }),
);
