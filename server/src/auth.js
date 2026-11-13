import crypto from "node:crypto";
import { promisify } from "node:util";
import { ObjectId } from "mongodb";
import { config } from "./config.js";

const scrypt = promisify(crypto.scrypt);
const COOKIE = "mc_session";
const SHORT_SESSION = 12 * 3600; // seconds
const LONG_SESSION = 30 * 24 * 3600; // "Se souvenir de moi"

export async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = await scrypt(password, salt, 64);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export async function verifyPassword(password, stored) {
  if (!stored) return false;
  const [, saltHex, hashHex] = stored.split("$");
  const expected = Buffer.from(hashHex, "hex");
  const actual = await scrypt(password, Buffer.from(saltHex, "hex"), expected.length);
  return crypto.timingSafeEqual(expected, actual);
}

export const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");

const sign = (data) => crypto.createHmac("sha256", config.sessionSecret).update(data).digest("base64url");

/**
 * The token carries a "session version" (sv): changing a password bumps it,
 * which invalidates every other open session of that user.
 */
function createToken(user, ttl, sid) {
  const payload = Buffer.from(
    JSON.stringify({ uid: String(user._id), sv: user.sessionVersion ?? 0, sid, exp: Math.floor(Date.now() / 1000) + ttl }),
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function readToken(token) {
  const [payload, signature] = token?.split(".") ?? [];
  if (!payload || !signature) return null;
  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    return data.exp > Date.now() / 1000 && ObjectId.isValid(data.uid) ? data : null;
  } catch {
    return null;
  }
}

const parseCookies = (header = "") =>
  Object.fromEntries(
    header
      .split(";")
      .map((c) => c.trim().split("="))
      .filter(([k]) => k)
      .map(([k, ...v]) => [k, decodeURIComponent(v.join("="))]),
  );

export const sessionTtl = (remember) => (remember ? LONG_SESSION : SHORT_SESSION);

/** sid names the session stored in MongoDB (sessions collection), so that it can be listed and revoked. */
export function setSessionCookie(res, user, remember, sid) {
  const ttl = sessionTtl(remember);
  res.cookie(COOKIE, createToken(user, ttl, sid), {
    httpOnly: true,
    sameSite: "lax",
    secure: config.cookieSecure,
    path: "/",
    // Without "remember me" the cookie lives for the browser session only.
    ...(remember ? { maxAge: ttl * 1000 } : {}),
  });
}

export const clearSessionCookie = (res) => res.clearCookie(COOKIE, { path: "/" });

export function readSession(req) {
  return readToken(parseCookies(req.headers.cookie)[COOKIE]);
}

/** Tiny in-memory rate limiter (single instance deployment). */
export function rateLimit({ windowMs, max }) {
  const hits = new Map();
  setInterval(() => {
    const now = Date.now();
    for (const [ip, entry] of hits) if (now > entry.reset) hits.delete(ip);
  }, windowMs).unref();
  return (req, res, next) => {
    const now = Date.now();
    const entry = hits.get(req.ip) ?? { count: 0, reset: now + windowMs };
    if (now > entry.reset) Object.assign(entry, { count: 0, reset: now + windowMs });
    entry.count += 1;
    hits.set(req.ip, entry);
    if (entry.count > max) return res.status(429).json({ error: "Trop de tentatives, réessayez dans quelques minutes." });
    next();
  };
}
