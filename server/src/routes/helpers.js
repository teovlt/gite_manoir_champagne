import { ObjectId } from "mongodb";
import { LANGS } from "../config.js";

export const today = () => new Date().toISOString().slice(0, 10);
export const str = (v, max = 5000) => (typeof v === "string" ? v.trim().slice(0, max) : "");
export const isDate = (v) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));
export const isSafeLink = (v) => typeof v === "string" && /^(\/|#|https?:\/\/)/.test(v);
export const isEmail = (v) => typeof v === "string" && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v);
export const optInt = (v, max) => (v === null || v === undefined || v === "" ? null : Math.min(Math.max(0, Math.trunc(Number(v)) || 0), max));
export const oid = (v) => (ObjectId.isValid(v) ? new ObjectId(v) : null);

/** Keeps only fr/en/de strings of a translatable value. */
export function translated(value, max = 500) {
  const out = {};
  for (const lang of LANGS) out[lang] = typeof value?.[lang] === "string" ? value[lang].trim().slice(0, max) : "";
  return out;
}

export const bad = (res, error, status = 400) => res.status(status).json({ error });

/** Wraps async handlers so rejections reach the error middleware (Express 5 does it, kept explicit). */
export const h = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/** [start, end) ranges overlap — end is the check-out day. */
export const overlapQuery = (start, end) => ({ start: { $lt: end }, end: { $gt: start } });

export const toEvent = (e) => ({
  id: String(e._id),
  title: e.title,
  text: e.text,
  startDate: e.startDate,
  endDate: e.endDate,
  link: e.link,
  active: e.active,
});

export const toPhoto = (p) => ({ id: String(p._id), key: p.key ?? null, section: p.section, alt: p.alt, url: p.url ?? null });

export const toUser = (u) => ({
  id: String(u._id),
  email: u.email,
  name: u.name,
  role: u.role,
  createdAt: u.createdAt,
  lastLoginAt: u.lastLoginAt ?? null,
  pending: !u.passwordHash,
});
