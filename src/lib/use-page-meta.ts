import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import seo from "@shared/seo.json";
import { LANGS, localize, stripLang, useLang, type Translated } from "./locale";

interface SeoPage {
  image?: string;
  title: Translated;
  description?: Translated;
}

const pages = seo.pages as Record<string, SeoPage>;

function setMeta(selector: string, create: () => HTMLElement, attr: string, value: string) {
  let el = document.head.querySelector(selector) as HTMLElement | null;
  if (!el) {
    el = create();
    document.head.appendChild(el);
  }
  el.setAttribute(attr, value);
}

/**
 * Sets <title>, meta description, <html lang>, canonical and hreflang alternates for the current page.
 * Titles and descriptions come from shared/seo.json — the server injects the same ones in the HTML
 * it sends (server/src/seo.js); `fallback` is used for pages that are not listed there (404).
 */
export function usePageMeta(fallback?: { title: string; description?: string }) {
  const lang = useLang();
  const { pathname } = useLocation();

  useEffect(() => {
    const base = stripLang(pathname).replace(/\/+$/, "") || "/";
    const page = pages[base];
    const title = page?.title[lang] ?? fallback?.title ?? "";
    const description = page?.description?.[lang] ?? fallback?.description;

    document.title = !title ? seo.site : base === "/" ? `${seo.site} — ${title}` : `${title} — ${seo.site}`;
    document.documentElement.lang = lang;
    if (description)
      setMeta(
        'meta[name="description"]',
        () => Object.assign(document.createElement("meta"), { name: "description" }),
        "content",
        description,
      );

    document.head.querySelectorAll('link[rel="alternate"][hreflang], link[rel="canonical"]').forEach((n) => n.remove());
    if (!page) return;
    const add = (rel: string, href: string, hreflang?: string) => {
      const link = Object.assign(document.createElement("link"), { rel, href });
      if (hreflang) link.hreflang = hreflang;
      document.head.appendChild(link);
    };
    add("canonical", window.location.origin + localize(base, lang));
    for (const l of [...LANGS, "x-default" as const])
      add("alternate", window.location.origin + localize(base, l === "x-default" ? "fr" : l), l);
  }, [fallback?.title, fallback?.description, lang, pathname]);
}
