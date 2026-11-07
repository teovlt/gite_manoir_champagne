import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const env = process.env;

const isProd = env.NODE_ENV === "production";

if (!env.SESSION_SECRET && isProd) {
  console.warn("[config] SESSION_SECRET is not set: a random one is used, sessions will not survive a restart.");
}

export const config = {
  isProd,
  port: Number(env.PORT ?? 3000),
  dataDir: path.resolve(env.DATA_DIR ?? path.join(here, "../data")),
  sharedDir: path.resolve(env.SHARED_DIR ?? path.join(here, "../../shared")),
  /** Built front-end (vite build output). Served when present. */
  staticDir: path.resolve(env.STATIC_DIR ?? path.join(here, "../../dist")),
  sessionSecret: env.SESSION_SECRET ?? crypto.randomBytes(32).toString("hex"),
  /** Set to "false" only when the site is served over plain HTTP (local tests). */
  cookieSecure: env.COOKIE_SECURE ? env.COOKIE_SECURE === "true" : isProd,
  trustProxy: env.TRUST_PROXY ?? (isProd ? "1" : "0"),
  admin: {
    email: env.ADMIN_EMAIL,
    password: env.ADMIN_PASSWORD,
    name: env.ADMIN_NAME ?? "Propriétaire",
  },
  smtp: env.SMTP_HOST
    ? {
        host: env.SMTP_HOST,
        port: Number(env.SMTP_PORT ?? 587),
        secure: env.SMTP_SECURE === "true",
        auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } : undefined,
        from: env.SMTP_FROM ?? env.SMTP_USER,
        to: env.NOTIFY_EMAIL,
      }
    : null,
};
