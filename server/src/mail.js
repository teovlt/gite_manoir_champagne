import { config } from "./config.js";

export const mailEnabled = Boolean(config.mail);

/** Sends an e-mail through the Resend HTTP API (no-op when RESEND_API_KEY is not set). */
async function send({ to, replyTo, subject, text }) {
  if (!config.mail) return;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${config.mail.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: config.mail.from, to, subject, text, ...(replyTo && { reply_to: replyTo }) }),
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
  await send({
    to: config.mail.to,
    replyTo: r.email,
    subject: `Nouvelle demande de réservation — ${r.name}`,
    text: [
      `Nom : ${r.name}`,
      `E-mail : ${r.email}`,
      `Dates : ${r.dates ?? "—"}`,
      `Voyageurs : ${guestsText(r)}`,
      `Langue : ${r.lang.toUpperCase()}`,
      "",
      r.message ?? "",
      "",
      `Répondez directement à cet e-mail, ou gérez la demande sur ${config.publicUrl}/admin/demandes`,
    ].join("\n"),
  });
}

const ack = {
  fr: {
    subject: "Votre demande au Manoir de la Champagne",
    body: (name) =>
      `Bonjour ${name},\n\nNous avons bien reçu votre demande et vous répondrons très rapidement.\n\nÀ bientôt au manoir,\nLoïc & Maryline Courteille\nManoir de la Champagne — 2 rue La Champagne, 50190 Millières`,
  },
  en: {
    subject: "Your request to the Manoir de la Champagne",
    body: (name) =>
      `Hello ${name},\n\nThank you, we have received your request and will get back to you very soon.\n\nSee you soon at the manor,\nLoïc & Maryline Courteille\nManoir de la Champagne — 2 rue La Champagne, 50190 Millières, France`,
  },
  de: {
    subject: "Ihre Anfrage an das Manoir de la Champagne",
    body: (name) =>
      `Guten Tag ${name},\n\nvielen Dank, wir haben Ihre Anfrage erhalten und melden uns in Kürze bei Ihnen.\n\nBis bald im Herrenhaus,\nLoïc & Maryline Courteille\nManoir de la Champagne — 2 rue La Champagne, 50190 Millières, Frankreich`,
  },
};

/** Automatic acknowledgement sent to the guest, in the language of the site they used. */
export async function acknowledgeRequest(r) {
  const t = ack[r.lang] ?? ack.fr;
  await send({ to: r.email, replyTo: config.mail?.to, subject: t.subject, text: t.body(r.name) });
}

export async function sendPasswordReset(user, token) {
  const link = `${config.publicUrl}/admin/reinitialiser?token=${token}`;
  await send({
    to: user.email,
    subject: "Réinitialisation de votre mot de passe — Manoir de la Champagne",
    text: `Bonjour ${user.name},\n\nPour choisir un nouveau mot de passe, ouvrez ce lien (valable 1 heure) :\n${link}\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez simplement cet e-mail.`,
  });
}

export async function sendInvitation(user, token, invitedBy) {
  const link = `${config.publicUrl}/admin/reinitialiser?token=${token}`;
  await send({
    to: user.email,
    subject: "Votre accès à l'espace propriétaires — Manoir de la Champagne",
    text: `Bonjour ${user.name},\n\n${invitedBy} vous a ouvert un accès à l'administration du site du Manoir de la Champagne.\nChoisissez votre mot de passe avec ce lien (valable 7 jours) :\n${link}`,
  });
}
