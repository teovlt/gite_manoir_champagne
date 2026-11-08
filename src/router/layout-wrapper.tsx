import { Suspense, useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { MobileBookingCta } from "@/components/site/mobile-cta";
import { LightboxProvider } from "@/components/site/lightbox";
import { LANGS, localize, stripLang, useLang, type Lang } from "@/lib/locale";

/** Keeps i18next in sync with the URL prefix, and sends first-time visitors to their browser language. */
const LangSync = () => {
  const lang = useLang();
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const { pathname, search, hash } = useLocation();

  useEffect(() => {
    if (i18n.language !== lang) i18n.changeLanguage(lang);
    document.documentElement.lang = lang;
  }, [lang, i18n]);

  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem("lang");
    } catch {
      /* ignore */
    }
    if (stored || lang !== "fr") return;
    const preferred = navigator.languages?.map((l) => l.slice(0, 2)).find((l) => (LANGS as readonly string[]).includes(l)) as
      | Lang
      | undefined;
    try {
      localStorage.setItem("lang", preferred ?? "fr");
    } catch {
      /* ignore */
    }
    if (preferred && preferred !== "fr") navigate(`${localize(stripLang(pathname), preferred)}${search}${hash}`, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
};

/** Scrolls to the top on navigation, or to the #anchor when the URL carries one. */
const ScrollManager = () => {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      const t = setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: "smooth" }), 60);
      return () => clearTimeout(t);
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);
  return null;
};

export const LayoutWrapper = () => (
  <LightboxProvider>
    <div className="min-h-screen overflow-x-clip bg-cream text-ink">
      <LangSync />
      <ScrollManager />
      <a
        href="#contenu"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-cream"
      >
        Aller au contenu
      </a>
      <SiteHeader />
      <main id="contenu">
        {/* Pages load on demand: keep the screen height while the chunk arrives, so the footer doesn't jump. */}
        <Suspense fallback={<div className="min-h-screen" />}>
          <Outlet />
        </Suspense>
      </main>
      <SiteFooter />
      <MobileBookingCta />
    </div>
  </LightboxProvider>
);
