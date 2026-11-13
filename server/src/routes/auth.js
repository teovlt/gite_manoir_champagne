import crypto from "node:crypto";
import express from "express";
import { col, getSetting, logActivity, markSeen } from "../db.js";
import { clearSessionCookie, hashPassword, rateLimit, readSession, sessionTtl, setSessionCookie, sha256, verifyPassword } from "../auth.js";
import { mailEnabled, sendPasswordReset } from "../mail.js";
import { bad, h, oid, str, toUser } from "./helpers.js";

export const authRoutes = express.Router();

export const MIN_PASSWORD = 10;

export const ROLE_RANK = { editor: 1, admin: 2, developer: 3 };
/** Administrators and developers (who can do everything an administrator can). */
export const isAdmin = (user) => (ROLE_RANK[user?.role] ?? 0) >= ROLE_RANK.admin;
export const isDeveloper = (user) => user?.role === "developer";

const SESSION_TOUCH = 5 * 60 * 1000;

/** Short description of the browser, for the sessions and sign-in lists. */
export const clientInfo = (req) => ({ ip: req.ip, ua: str(req.headers["user-agent"], 400) });

/** Opens a session: stored in MongoDB (listed, revocable) and signed in the cookie. */
export async function startSession(req, res, user, remember) {
  const sid = crypto.randomBytes(18).toString("base64url");
  const now = new Date();
  await col.sessions.insertOne({
    _id: sid,
    uid: user._id,
    sv: user.sessionVersion ?? 0,
    remember: Boolean(remember),
    ...clientInfo(req),
    createdAt: now,
    lastSeenAt: now,
    expiresAt: new Date(now.getTime() + sessionTtl(remember) * 1000),
  });
  setSessionCookie(res, user, remember, sid);
}

export const recordLogin = (req, { email, user, ok, reason }) =>
  col.logins
    .insertOne({ at: new Date(), email, uid: user?._id ?? null, name: user?.name ?? null, ok, reason, ...clientInfo(req) })
    .catch((err) => console.error("[auth] login log:", err.message));

/**
 * "devOnly" access (developer space › Accès) closes the administration to everyone but developers,
 * e.g. while an account that was taken over is being dealt with.
 */
const accessClosed = async (user) => !isDeveloper(user) && (await getSetting("adminAccess", "normal")) === "devOnly";

/** Loads the signed-in user (or null) — sessions die when the password changes or when they are revoked. */
export async function sessionUser(req) {
  const session = readSession(req);
  if (!session) return null;
  const user = await col.users.findOne({ _id: oid(session.uid) });
  if (!user || !user.passwordHash || user.disabled || (user.sessionVersion ?? 0) !== session.sv) return null;
  if (session.sid) {
    const stored = await col.sessions.findOne({ _id: session.sid });
    if (!stored || String(stored.uid) !== String(user._id)) return null;
    if (Date.now() - stored.lastSeenAt > SESSION_TOUCH || stored.ip !== req.ip)
      await col.sessions.updateOne({ _id: stored._id }, { $set: { lastSeenAt: new Date(), ip: req.ip } }).catch(() => {});
    req.sessionId = stored._id;
  }
  if (await accessClosed(user)) return null;
  // Tracking must never lock someone out.
  await markSeen(user).catch((err) => console.error("[auth] last seen:", err.message));
  return user;
}

authRoutes.post(
  "/login",
  rateLimit({ windowMs: 15 * 60 * 1000, max: 10 }),
  h(async (req, res) => {
    const email = str(req.body?.email, 200).toLowerCase();
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    const user = await col.users.findOne({ email });
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      await recordLogin(req, { email, user, ok: false, reason: user ? "password" : "unknown" });
      return bad(res, "E-mail ou mot de passe incorrect.", 401);
    }
    if (user.disabled) {
      await recordLogin(req, { email, user, ok: false, reason: "disabled" });
      return bad(res, "Ce compte est suspendu. Contactez le développeur du site.", 403);
    }
    if (await accessClosed(user)) {
      await recordLogin(req, { email, user, ok: false, reason: "closed" });
      return bad(res, "L'administration est momentanément fermée pour maintenance technique.", 503);
    }
    await recordLogin(req, { email, user, ok: true, reason: "password" });
    await markSeen(user, { signIn: true });
    await startSession(req, res, user, Boolean(req.body?.remember));
    res.json(toUser(user));
  }),
);

authRoutes.post(
  "/logout",
  h(async (req, res) => {
    const sid = readSession(req)?.sid;
    if (sid) await col.sessions.deleteOne({ _id: sid });
    clearSessionCookie(res);
    res.json({ ok: true });
  }),
);

authRoutes.get(
  "/me",
  h(async (req, res) => {
    const user = await sessionUser(req);
    if (!user) return bad(res, "Non connecté.", 401);
    res.json(toUser(user));
  }),
);

/** Stores a fresh one-hour reset token and e-mails the link (fire and forget). */
export async function sendResetLink(user) {
  const token = crypto.randomBytes(32).toString("base64url");
  await col.users.updateOne({ _id: user._id }, { $set: { resetTokenHash: sha256(token), resetExpires: new Date(Date.now() + 3600 * 1000) } });
  await sendPasswordReset(user, token);
}

/** Always answers the same thing, so the form cannot be used to discover accounts. */
authRoutes.post(
  "/forgot",
  rateLimit({ windowMs: 15 * 60 * 1000, max: 5 }),
  h(async (req, res) => {
    const email = str(req.body?.email, 200).toLowerCase();
    const user = email && (await col.users.findOne({ email }));
    if (user && mailEnabled) sendResetLink(user).catch((err) => console.error("[mail]", err.message));
    if (!mailEnabled) console.warn("[auth] password reset requested but e-mail (RESEND_API_KEY) is not configured");
    res.json({ ok: true, mailEnabled });
  }),
);

authRoutes.post(
  "/reset",
  rateLimit({ windowMs: 15 * 60 * 1000, max: 10 }),
  h(async (req, res) => {
    const token = str(req.body?.token, 200);
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    if (password.length < MIN_PASSWORD) return bad(res, `Le mot de passe doit faire au moins ${MIN_PASSWORD} caractères.`);
    const user = token && (await col.users.findOne({ resetTokenHash: sha256(token), resetExpires: { $gt: new Date() } }));
    if (!user) return bad(res, "Ce lien a expiré ou a déjà été utilisé. Refaites une demande.");
    const sessionVersion = (user.sessionVersion ?? 0) + 1;
    await col.users.updateOne(
      { _id: user._id },
      { $set: { passwordHash: await hashPassword(password), sessionVersion }, $unset: { resetTokenHash: "", resetExpires: "" } },
    );
    await recordLogin(req, { email: user.email, user, ok: true, reason: "reset" });
    await markSeen(user, { signIn: true });
    await startSession(req, res, { ...user, sessionVersion }, false);
    res.json(toUser(user));
  }),
);

/** Link sent to the new address when someone changes the e-mail of their own account. */
authRoutes.post(
  "/confirm-email",
  rateLimit({ windowMs: 15 * 60 * 1000, max: 10 }),
  h(async (req, res) => {
    const token = str(req.body?.token, 200);
    const user = token && (await col.users.findOne({ emailTokenHash: sha256(token), emailExpires: { $gt: new Date() } }));
    if (!user?.pendingEmail) return bad(res, "Ce lien a expiré ou a déjà été utilisé. Refaites le changement depuis Mon compte.");
    const unset = { pendingEmail: "", emailTokenHash: "", emailExpires: "" };
    if (await col.users.findOne({ email: user.pendingEmail, _id: { $ne: user._id } })) {
      await col.users.updateOne({ _id: user._id }, { $unset: unset });
      return bad(res, "Un autre compte utilise déjà cette adresse.", 409);
    }
    await col.users.updateOne({ _id: user._id }, { $set: { email: user.pendingEmail }, $unset: unset });
    await logActivity(user.name.split(" ")[0], `a changé son adresse e-mail de connexion`);
    res.json({ ok: true, email: user.pendingEmail });
  }),
);
