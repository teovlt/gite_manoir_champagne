import nodemailer from "nodemailer";
import { config } from "./config.js";

const transport = config.smtp?.to ? nodemailer.createTransport(config.smtp) : null;

/** E-mails the owners when a booking request arrives (only when SMTP_* and NOTIFY_EMAIL are set). */
export async function notifyNewRequest(r) {
  if (!transport) return;
  const guests = [r.adults && `${r.adults} adulte(s)`, r.children && `${r.children} enfant(s)`].filter(Boolean).join(", ");
  await transport.sendMail({
    from: config.smtp.from,
    to: config.smtp.to,
    replyTo: r.email,
    subject: `Nouvelle demande de réservation — ${r.name}`,
    text: [
      `Nom : ${r.name}`,
      `E-mail : ${r.email}`,
      `Dates : ${r.dates ?? "—"}`,
      `Voyageurs : ${guests || "—"}`,
      "",
      r.message ?? "",
      "",
      "Répondez directement à cet e-mail pour contacter le voyageur.",
    ].join("\n"),
  });
}
