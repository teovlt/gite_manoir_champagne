import dns from "node:dns";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const env = process.env;

const isProd = env.NODE_ENV === "production";

// Some Docker/VPS resolvers cannot answer the SRV queries used by mongodb+srv:// URIs.
// DNS_SERVERS (comma-separated, optional) makes Node query those servers instead.
if (env.DNS_SERVERS) {
  const servers = env.DNS_SERVERS.split(",").map((s) => s.trim()).filter(Boolean);
  dns.setServers(servers);
  dns.promises.setServers(servers);
}

if (!env.MONGODB_URI) {
  console.error("[config] MONGODB_URI is required (e.g. mongodb+srv://user:pass@cluster/manoir).");
  process.exit(1);
}
if (!env.SESSION_SECRET && isProd) {
  console.warn("[config] SESSION_SECRET is not set: a random one is used, sessions will not survive a restart.");
}

export const config = {
  isProd,
  port: Number(env.PORT ?? 3000),
  mongoUri: env.MONGODB_URI,
  /** Database name when the URI does not contain one. */
  mongoDb: env.MONGODB_DB || undefined,
  /** Public address of the site, used in e-mails, sitemap.xml and hreflang. */
  publicUrl: (env.PUBLIC_URL ?? "http://localhost:5173").replace(/\/$/, ""),
  sharedDir: path.resolve(env.SHARED_DIR ?? path.join(here, "../../shared")),
  /** Built front-end (vite build output). Served when present. */
  staticDir: path.resolve(env.STATIC_DIR ?? path.join(here, "../../dist")),
  sessionSecret: env.SESSION_SECRET ?? crypto.randomBytes(32).toString("hex"),
  /** Set to "false" only when the site is served over plain HTTP (local tests). */
  cookieSecure: env.COOKIE_SECURE ? env.COOKIE_SECURE === "true" : isProd,
  trustProxy: env.TRUST_PROXY ?? (isProd ? "1" : "0"),
  /** Minutes between two synchronisations of the iCal calendars (Abritel, Airbnb…). */
  icalSyncMinutes: Number(env.ICAL_SYNC_MINUTES ?? 30),
  admin: {
    email: env.ADMIN_EMAIL,
    password: env.ADMIN_PASSWORD,
    name: env.ADMIN_NAME ?? "Propriétaire",
  },
  /** Resend (https://resend.com). MAIL_FROM must use a domain verified in Resend. */
  mail: env.RESEND_API_KEY
    ? {
        apiKey: env.RESEND_API_KEY,
        from: env.MAIL_FROM ?? "Manoir de la Champagne <onboarding@resend.dev>",
        to: env.NOTIFY_EMAIL,
      }
    : null,
};

export const LANGS = ["fr", "en", "de"];
