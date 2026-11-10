import crypto from "node:crypto";
import express from "express";
import { col, logActivity } from "../db.js";
import { clearSessionCookie, hashPassword, rateLimit, readSession, setSessionCookie, sha256, verifyPassword } from "../auth.js";
import { mailEnabled, sendPasswordReset } from "../mail.js";
import { bad, h, oid, str, toUser } from "./helpers.js";

export const authRoutes = express.Router();

export const MIN_PASSWORD = 10;

/** Loads the signed-in user (or null) — sessions die when the password changes. */
export async function sessionUser(req) {
  const session = readSession(req);
  if (!session) return null;
  const user = await col.users.findOne({ _id: oid(session.uid) });
  if (!user || !user.passwordHash || (user.sessionVersion ?? 0) !== session.sv) return null;
  return user;
}

authRoutes.post(
  "/login",
  rateLimit({ windowMs: 15 * 60 * 1000, max: 10 }),
  h(async (req, res) => {
    const email = str(req.body?.email, 200).toLowerCase();
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    const user = await col.users.findOne({ email });
    if (!user || !(await verifyPassword(password, user.passwordHash))) return bad(res, "E-mail ou mot de passe incorrect.", 401);
    await col.users.updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date() } });
    setSessionCookie(res, user, Boolean(req.body?.remember));
    res.json(toUser(user));
  }),
);

authRoutes.post("/logout", (_req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

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
      { $set: { passwordHash: await hashPassword(password), sessionVersion, lastLoginAt: new Date() }, $unset: { resetTokenHash: "", resetExpires: "" } },
    );
    setSessionCookie(res, { ...user, sessionVersion }, false);
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
