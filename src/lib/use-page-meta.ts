import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { LANGS, localize, stripLang, useLang } from "./locale";

const SITE = "Manoir de la Champagne";

function setMeta(selector: string, create: () => HTMLElement, attr: string, value: string) {
  let el = document.head.querySelector(selector) as HTMLElement | null;
  if (!el) {
    el = create();
    document.head.appendChild(el);
  }
  el.setAttribute(attr, value);
}

/** Sets <title>, meta description, <html lang> and hreflang alternates for the current page. */
export function usePageMeta({ title, description }: { title: string; description?: string }) {
  const lang = useLang();
  const { pathname } = useLocation();

  useEffect(() => {
    document.title = title === SITE || !title ? SITE : `${title} — ${SITE}`;
    document.documentElement.lang = lang;
    if (description) setMeta('meta[name="description"]', () => Object.assign(document.createElement("meta"), { name: "description" }), "content", description);

    document.head.querySelectorAll('link[data-hreflang="1"]').forEach((n) => n.remove());
    const base = stripLang(pathname);
    for (const l of [...LANGS, "x-default" as const]) {
      const link = document.createElement("link");
      link.rel = "alternate";
      link.hreflang = l;
      link.href = window.location.origin + localize(base, l === "x-default" ? "fr" : l);
      link.dataset.hreflang = "1";
      document.head.appendChild(link);
    }
  }, [title, description, lang, pathname]);
}
