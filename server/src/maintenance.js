import { getSetting } from "./db.js";

const DEFAULT_MESSAGE = {
  fr: "Le site est en cours de maintenance. Merci de revenir dans quelques instants.",
  en: "The website is undergoing maintenance. Please come back in a little while.",
  de: "Die Website wird gerade gewartet. Bitte versuchen Sie es in Kürze erneut.",
};
const TITLE = { fr: "Maintenance en cours", en: "Maintenance in progress", de: "Wartungsarbeiten" };
const BACK = { fr: "Retour prévu", en: "Expected back", de: "Voraussichtlich zurück" };
const CONTACT = { fr: "Pour une réservation urgente", en: "For an urgent booking", de: "Für eine dringende Buchung" };

let cache = { at: 0, value: null };

/** Maintenance settings (developer space), read at most every 5 s: every page view asks. */
export async function maintenanceState() {
  if (Date.now() - cache.at > 5000) cache = { at: Date.now(), value: await getSetting("maintenance", { enabled: false }) };
  return cache.value;
}

export const forgetMaintenanceCache = () => (cache = { at: 0, value: null });

const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** Standalone page (no JavaScript, no request to the API) served instead of the site to visitors. */
export function maintenancePage(state, lang, site = {}) {
  // A language left empty gets the default text in that language (the visitor may not read French).
  const message = state.message?.[lang]?.trim() || DEFAULT_MESSAGE[lang];
  const until = state.until
    ? new Date(state.until).toLocaleString({ fr: "fr-FR", en: "en-GB", de: "de-DE" }[lang], {
        timeZone: "Europe/Paris",
        dateStyle: "long",
        timeStyle: "short",
      })
    : null;
  const contact = [site.phone, site.email].filter(Boolean).map(esc).join(" · ");
  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex" />
<title>${TITLE[lang]} — Manoir de la Champagne</title>
<link rel="icon" href="/favicon.svg" />
<style>
  :root { color-scheme: light; }
  body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #F4EFE3; color: #2B2A24;
    font-family: "Inter Variable", system-ui, -apple-system, "Segoe UI", sans-serif; padding: 24px; box-sizing: border-box; }
  main { max-width: 520px; text-align: center; background: #FBF8F1; border: 1px solid #DCD3BE; border-radius: 24px; padding: 44px 32px; }
  .mark { width: 56px; height: 56px; margin: 0 auto 22px; border-radius: 50%; background: #7E8C69; display: grid; place-items: center; }
  h1 { font-family: "Fraunces Variable", Georgia, serif; font-weight: 500; font-size: 28px; margin: 0 0 6px; }
  .site { text-transform: uppercase; letter-spacing: 1.5px; font-size: 12px; color: #8A8270; margin: 0 0 22px; }
  p { line-height: 1.6; margin: 0 0 14px; white-space: pre-line; }
  .until { display: inline-block; background: #EFE2C4; color: #8A4E2F; border-radius: 999px; padding: 6px 14px; font-size: 14px; font-weight: 600; }
  .contact { margin-top: 22px; font-size: 14px; color: #6E6756; }
</style>
</head>
<body>
<main>
  <div class="mark" aria-hidden="true">
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#FBF8F1" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
  </div>
  <p class="site">Manoir de la Champagne</p>
  <h1>${TITLE[lang]}</h1>
  <p>${esc(message)}</p>
  ${until ? `<p><span class="until">${BACK[lang]} : ${esc(until)}</span></p>` : ""}
  ${contact ? `<p class="contact">${CONTACT[lang]} : ${contact}</p>` : ""}
</main>
</body>
</html>`;
}
