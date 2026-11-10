import { config } from "./config.js";

/**
 * Turns the plain-text body the owners edit into a branded HTML e-mail.
 * Rules kept simple so the text editor stays the single source:
 *  - blank line → new paragraph, single line break → <br>
 *  - a line holding only a link → a button (with the raw link underneath for copy-paste)
 *  - other links and e-mail addresses become clickable
 * Table layout and inline styles: what e-mail clients (Gmail, Outlook, Apple Mail) understand.
 */

const C = {
  page: "#f4efe2",
  card: "#fbf7ed",
  line: "#eadfc2",
  ink: "#2b2a25",
  soft: "#45412f",
  muted: "#6b6552",
  clay: "#be6a45",
};

const footerText = {
  fr: { tagline: "Gîte de charme en Normandie", site: "Visiter le site" },
  en: { tagline: "Charming holiday home in Normandy", site: "Visit the website" },
  de: { tagline: "Charmantes Ferienhaus in der Normandie", site: "Zur Website" },
};
const buttonText = { fr: "Ouvrir le lien", en: "Open the link", de: "Link öffnen" };

const escape = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const URL_RE = /https?:\/\/[^\s<>"]+[^\s<>".,;:!?)»]/g;
const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;

/** Escapes a line, then links its URLs and e-mail addresses. */
function inline(line) {
  const parts = [];
  let last = 0;
  const matches = [...line.matchAll(new RegExp(`${URL_RE.source}|${EMAIL_RE.source}`, "g"))];
  for (const m of matches) {
    parts.push(escape(line.slice(last, m.index)));
    const value = m[0];
    const href = value.startsWith("http") ? value : `mailto:${value}`;
    parts.push(`<a href="${escape(href)}" style="color:${C.clay};text-decoration:underline;word-break:break-all">${escape(value)}</a>`);
    last = m.index + value.length;
  }
  parts.push(escape(line.slice(last)));
  return parts.join("");
}

const button = (href, lang) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 6px"><tr><td style="border-radius:999px;background:${C.clay}">` +
  `<a href="${escape(href)}" style="display:inline-block;padding:13px 26px;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;color:#fbf7ed;text-decoration:none;border-radius:999px">${buttonText[lang] ?? buttonText.fr}</a>` +
  `</td></tr></table>` +
  `<p style="margin:8px 0 0;font-size:12px;line-height:1.5;color:${C.muted};word-break:break-all">${escape(href)}</p>`;

function bodyHtml(text, lang) {
  return text
    .replace(/\r\n/g, "\n")
    .trim()
    .split(/\n\s*\n/)
    .map((block) => {
      const lines = block.split("\n");
      const onlyLink = lines.length === 1 && /^\s*https?:\/\/\S+\s*$/.test(lines[0]);
      if (onlyLink) return `<div style="margin:0 0 18px">${button(lines[0].trim(), lang)}</div>`;
      // A paragraph whose last line is a lone link: text, then the button.
      const tail = lines.at(-1);
      if (lines.length > 1 && /^\s*https?:\/\/\S+\s*$/.test(tail)) {
        const intro = lines.slice(0, -1).map(inline).join("<br>");
        return `<p style="margin:0 0 12px">${intro}</p><div style="margin:0 0 18px">${button(tail.trim(), lang)}</div>`;
      }
      return `<p style="margin:0 0 16px">${lines.map(inline).join("<br>")}</p>`;
    })
    .join("\n");
}

export function renderHtml({ subject, text, lang = "fr" }) {
  const f = footerText[lang] ?? footerText.fr;
  const site = config.publicUrl + (lang === "fr" ? "/" : `/${lang}`);
  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<title>${escape(subject)}</title>
</head>
<body style="margin:0;padding:0;background:${C.page}">
<div style="display:none;max-height:0;overflow:hidden">${escape(subject)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.page}">
<tr><td align="center" style="padding:32px 14px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:580px">
    <tr><td align="center" style="padding:0 0 20px">
      <div style="font-family:Georgia,'Times New Roman',serif;font-size:22px;color:${C.ink}">Manoir de la Champagne</div>
      <div style="margin-top:6px;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:${C.muted}">${f.tagline}</div>
      <div style="margin:14px auto 0;width:42px;height:2px;background:${C.clay}"></div>
    </td></tr>
    <tr><td style="background:${C.card};border:1px solid ${C.line};border-radius:18px;padding:32px 30px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.65;color:${C.soft}">
${bodyHtml(text, lang)}
    </td></tr>
    <tr><td align="center" style="padding:22px 10px 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:${C.muted}">
      Manoir de la Champagne · 2 rue La Champagne, 50190 Millières<br>
      <a href="${escape(site)}" style="color:${C.muted};text-decoration:underline">${f.site}</a>
    </td></tr>
  </table>
</td></tr>
</table>
</body>
</html>`;
}
