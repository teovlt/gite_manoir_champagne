import { useCallback } from "react";
import { useLocation } from "react-router-dom";

export const LANGS = ["fr", "en", "de"] as const;
export type Lang = (typeof LANGS)[number];
export type Translated = Record<Lang, string>;

export const langLabels: Record<Lang, string> = { fr: "Français", en: "English", de: "Deutsch" };
export const intlLocale: Record<Lang, string> = { fr: "fr-FR", en: "en-GB", de: "de-DE" };

export const langFromPath = (pathname: string): Lang => {
  const m = /^\/(en|de)(\/|$)/.exec(pathname);
  return (m?.[1] as Lang) ?? "fr";
};

/** Path without its language prefix: "/en/tarifs" → "/tarifs". */
export const stripLang = (pathname: string) => pathname.replace(/^\/(en|de)(?=\/|$)/, "") || "/";

export const localize = (path: string, lang: Lang) => {
  if (!path.startsWith("/") || path.startsWith("/admin") || path.startsWith("/uploads") || /\.\w+$/.test(path)) return path;
  if (lang === "fr") return path;
  return path === "/" ? `/${lang}` : `/${lang}${path}`;
};

export function useLang(): Lang {
  return langFromPath(useLocation().pathname);
}

/** Returns a function that prefixes internal links with the current language. */
export function useLocalePath() {
  const lang = useLang();
  return useCallback((path: string) => localize(path, lang), [lang]);
}

/** Picks the current language of a translated value, falling back to French. */
export function useTr() {
  const lang = useLang();
  return useCallback((value: Partial<Translated> | string | null | undefined) => {
    if (!value) return "";
    if (typeof value === "string") return value;
    return value[lang] || value.fr || "";
  }, [lang]);
}
