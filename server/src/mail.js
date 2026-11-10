import { config } from "./config.js";
import { renderTemplate } from "./mail-templates.js";

export const mailEnabled = Boolean(config.mail);

/** Sends an e-mail through the Resend HTTP API (no-op when RESEND_API_KEY is not set). */
export async function send({ to, replyTo, subject, text, html }) {
  if (!config.mail) return;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${config.mail.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: config.mail.from, to, subject, text, ...(html && { html }), ...(replyTo && { reply_to: replyTo }) }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(`Resend ${res.status}: ${body.message ?? res.statusText}`);
  }
}

const guestsText = (r) => [r.adults && `${r.adults} adulte(s)`, r.children && `${r.children} enfant(s)`].filter(Boolean).join(", ") || "—";

/** E-mails the owners when a booking request arrives (needs NOTIFY_EMAIL). */
export async function notifyNewRequest(r) {
  if (!config.mail?.to) return;
  const vars = {
    nom: r.name,
    email: r.email,
    dates: r.dates ?? "—",
    voyageurs: guestsText(r),
    langue: r.lang.toUpperCase(),
    message: r.message ?? "",
    lien_admin: `${config.publicUrl}/admin/demandes`,
  };
  const mail = await renderTemplate(r.kind === "question" ? "newQuestion" : "newRequest", "fr", vars);
  await send({ to: config.mail.to, replyTo: r.email, ...mail });
}

/** Automatic acknowledgement sent to the guest, in the language of the site they used. */
export async function acknowledgeRequest(r) {
  await send({ to: r.email, replyTo: config.mail?.to, ...(await renderTemplate("ack", r.lang, { nom: r.name })) });
}

const frDay = (iso) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

/** Warns the owners that a platform booking overlaps a stay of the site (needs NOTIFY_EMAIL). */
export async function notifyConflicts(conflicts) {
  if (!config.mail?.to || !conflicts.length) return;
  const liste = conflicts
    .map(
      (c) =>
        `• ${c.external.platform} : ${frDay(c.external.start)} → ${frDay(c.external.end)} (${c.external.label})\n` +
        `  chevauche « ${c.local.label} » : ${frDay(c.local.start)} → ${frDay(c.local.end)}`,
    )
    .join("\n");
  await send({ to: config.mail.to, ...(await renderTemplate("conflicts", "fr", { liste, lien_admin: `${config.publicUrl}/admin/calendrier` })) });
}

const tokenLink = (page, token) => `${config.publicUrl}/admin/${page}?token=${token}`;

export async function sendPasswordReset(user, token) {
  await send({ to: user.email, ...(await renderTemplate("passwordReset", "fr", { nom: user.name, lien: tokenLink("reinitialiser", token) })) });
}

export async function sendInvitation(user, token, invitedBy) {
  await send({
    to: user.email,
    ...(await renderTemplate("invitation", "fr", { nom: user.name, invite_par: invitedBy, lien: tokenLink("reinitialiser", token) })),
  });
}

export async function sendEmailChange(user, newEmail, token) {
  await send({
    to: newEmail,
    ...(await renderTemplate("emailChange", "fr", { nom: user.name, nouvel_email: newEmail, lien: tokenLink("confirmer-email", token) })),
  });
}
