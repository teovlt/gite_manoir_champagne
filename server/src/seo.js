import fs from "node:fs";
import path from "node:path";
import { config, LANGS } from "./config.js";
import { contentSchema, getSetting } from "./db.js";

const seo = JSON.parse(fs.readFileSync(path.join(config.sharedDir, "seo.json"), "utf8"));
const OG_LOCALE = { fr: "fr_FR", en: "en_GB", de: "de_DE" };

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const url = (lang, base) => `${config.publicUrl}${lang === "fr" ? "" : `/${lang}`}${base === "/" && lang !== "fr" ? "" : base}`;

/** Structured data for search engines (address, position, phone…), from the owners' settings. */
async function lodgingJsonLd(lang) {
  const site = await getSetting("site", contentSchema.settings);
  const [street, city = ""] = (site.address ?? "").split(",").map((s) => s.trim());
  const [postalCode, ...locality] = city.split(" ");
  const data = {
    "@context": "https://schema.org",
    "@type": "LodgingBusiness",
    name: seo.site,
    description: seo.pages["/"].description[lang],
    url: url(lang, "/"),
    image: `${config.publicUrl}${seo.pages["/"].image}`,
    telephone: site.phone?.replace(/\s|\(0\)/g, ""),
    priceRange: "€€",
    address: {
      "@type": "PostalAddress",
      streetAddress: street,
      postalCode,
      addressLocality: locality.join(" "),
      addressRegion: "Normandie",
      addressCountry: "FR",
    },
    geo: site.location && { "@type": "GeoCoordinates", latitude: site.location.lat, longitude: site.location.lng },
    amenityFeature: ["Spa", "Garden", "Fishing pond", "Barbecue", "Fireplace", "Wheelchair accessible room"].map((name) => ({
      "@type": "LocationFeatureSpecification",
      name,
      value: true,
    })),
  };
  return `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, "\\u003c")}</script>`;
}

/**
 * Renders index.html for a public URL with its own title, description, canonical, hreflang and
 * Open Graph tags, so that crawlers and link previews see them without running JavaScript.
 * Unknown pages get a real 404 status.
 */
export async function renderPage(indexHtml, reqPath) {
  const lang = /^\/(en|de)(\/|$)/.exec(reqPath)?.[1] ?? "fr";
  const base = reqPath.replace(/^\/(en|de)(?=\/|$)/, "").replace(/\/+$/, "") || "/";
  let html = indexHtml.replace('<html lang="fr">', `<html lang="${lang}">`);

  if (base.startsWith("/admin")) return { status: 200, html: html.replace("</head>", '<meta name="robots" content="noindex" />\n</head>') };

  const page = seo.pages[base];
  if (!page) return { status: 404, html: html.replace("</head>", '<meta name="robots" content="noindex" />\n</head>') };

  const title = base === "/" ? `${seo.site} — ${page.title[lang]}` : `${page.title[lang]} — ${seo.site}`;
  const description = page.description?.[lang] ?? seo.pages["/"].description[lang];
  const image = `${config.publicUrl}${page.image ?? seo.pages["/"].image}`;
  const head = [
    `<link rel="canonical" href="${url(lang, base)}" />`,
    ...LANGS.map((l) => `<link rel="alternate" hreflang="${l}" href="${url(l, base)}" />`),
    `<link rel="alternate" hreflang="x-default" href="${url("fr", base)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${seo.site}" />`,
    `<meta property="og:title" content="${esc(title)}" />`,
    `<meta property="og:description" content="${esc(description)}" />`,
    `<meta property="og:url" content="${url(lang, base)}" />`,
    `<meta property="og:image" content="${image}" />`,
    `<meta property="og:locale" content="${OG_LOCALE[lang]}" />`,
    ...LANGS.filter((l) => l !== lang).map((l) => `<meta property="og:locale:alternate" content="${OG_LOCALE[l]}" />`),
    `<meta name="twitter:card" content="summary_large_image" />`,
  ];
  if (base === "/" || base === "/contact") head.push(await lodgingJsonLd(lang));

  html = html
    .replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`)
    .replace(/<meta name="description" content="[^"]*" \/>/, `<meta name="description" content="${esc(description)}" />`)
    .replace("</head>", `${head.join("\n")}\n</head>`);
  return { status: 200, html };
}
