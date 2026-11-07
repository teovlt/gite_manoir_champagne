import crypto from "node:crypto";
import { promisify } from "node:util";
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
  const [, saltHex, hashHex] = stored.split("$");
  const expected = Buffer.from(hashHex, "hex");
  const actual = await scrypt(password, Buffer.from(saltHex, "hex"), expected.length);
  return crypto.timingSafeEqual(expected, actual);
}

const sign = (data) => crypto.createHmac("sha256", config.sessionSecret).update(data).digest("base64url");

function createToken(userId, ttl) {
  const payload = Buffer.from(JSON.stringify({ uid: userId, exp: Math.floor(Date.now() / 1000) + ttl })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function readToken(token) {
  const [payload, signature] = token?.split(".") ?? [];
  if (!payload || !signature) return null;
  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) return null;
  const data = JSON.parse(Buffer.from(payload, "base64url").toString());
  return data.exp > Date.now() / 1000 ? data : null;
}

const parseCookies = (header = "") =>
  Object.fromEntries(
    header
      .split(";")
      .map((c) => c.trim().split("="))
      .filter(([k]) => k)
      .map(([k, ...v]) => [k, decodeURIComponent(v.join("="))]),
  );

export function setSessionCookie(res, userId, remember) {
  const ttl = remember ? LONG_SESSION : SHORT_SESSION;
  res.cookie(COOKIE, createToken(userId, ttl), {
    httpOnly: true,
    sameSite: "lax",
    secure: config.cookieSecure,
    path: "/",
    // Without "remember me" the cookie lives for the browser session only.
    ...(remember ? { maxAge: ttl * 1000 } : {}),
  });
}

export const clearSessionCookie = (res) => res.clearCookie(COOKIE, { path: "/" });

export function sessionUserId(req) {
  return readToken(parseCookies(req.headers.cookie)[COOKIE])?.uid ?? null;
}

/** Tiny in-memory rate limiter (single instance deployment). */
export function rateLimit({ windowMs, max }) {
  const hits = new Map();
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
