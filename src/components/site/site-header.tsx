import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { Menu } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { LANGS, langLabels, localize, stripLang, useLang, useLocalePath } from "@/lib/locale";
import { cn } from "@/lib/utils";
import { Logo } from "./ornaments";

export const mainNav = [
  { to: "/", key: "home" },
  { to: "/le-gite", key: "gite" },
  { to: "/jardins-spa", key: "jardins" },
  { to: "/tarifs", key: "tarifs" },
  { to: "/region", key: "region" },
  { to: "/avis", key: "avis" },
  { to: "/contact", key: "contact" },
] as const;

/** FR / EN / DE switch: keeps the current page (and its query string). */
export const LanguagePills = ({ onSwitch }: { onSwitch?: () => void }) => {
  const { t } = useTranslation();
  const lang = useLang();
  const { pathname, search } = useLocation();
  const base = stripLang(pathname);

  return (
    <nav className="flex items-center gap-0.5" aria-label={t("navbar.language")}>
      {LANGS.map((l) => (
        <Link
          key={l}
          to={`${localize(base, l)}${search}`}
          hrefLang={l}
          lang={l}
          onClick={() => {
            try {
              localStorage.setItem("lang", l);
            } catch {
              /* ignore */
            }
            onSwitch?.();
          }}
          aria-current={l === lang ? "true" : undefined}
          title={langLabels[l]}
          className={cn(
            "rounded-full px-[9px] py-[5px] text-[11px] tracking-[0.5px] uppercase transition-colors",
            l === lang ? "bg-wheat font-bold text-ink" : "font-semibold text-stone hover:text-ink",
          )}
        >
          {l}
        </Link>
      ))}
    </nav>
  );
};

export const BrandLink = ({ onClick }: { onClick?: () => void }) => {
  const { t } = useTranslation();
  const l = useLocalePath();
  return (
    <Link to={l("/")} onClick={onClick} className="flex items-center gap-3 text-ink hover:text-ink">
      <Logo />
      <span className="flex flex-col leading-tight">
        <span className="font-serif text-[18px] font-semibold sm:whitespace-nowrap sm:text-[21px]">Manoir de la Champagne</span>
        <span className="text-[11px] uppercase tracking-[1.5px] text-stone">{t("navbar.tagline")}</span>
      </span>
    </Link>
  );
};

export function SiteHeader() {
  const { t } = useTranslation();
  const l = useLocalePath();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "pb-1 text-[13px] uppercase tracking-[1px] transition-colors hover:text-clay",
      isActive ? "border-b-2 border-clay font-semibold text-ink" : "border-b-2 border-transparent font-medium text-olive",
    );

  return (
    <header
      className={cn(
        "px-gutter sticky top-0 z-50 flex items-center justify-between gap-4 border-b bg-cream/95 py-[18px] backdrop-blur transition-shadow xl:gap-6",
        scrolled ? "border-line-strong shadow-[0_6px_24px_rgba(43,42,37,0.08)]" : "border-line",
      )}
    >
      <BrandLink />

      <nav aria-label={t("navbar.main")} className="hidden gap-5 whitespace-nowrap xl:flex 2xl:gap-[26px]">
        {mainNav.map((item) => (
          <NavLink key={item.to} to={l(item.to)} end className={linkClass}>
            {t(`navbar.${item.key}`)}
          </NavLink>
        ))}
      </nav>

      <div className="hidden shrink-0 items-center gap-[18px] sm:flex">
        <LanguagePills />
        <Button asChild variant="clay" size="pill">
          <Link to={l("/tarifs")}>{t("navbar.book")}</Link>
        </Button>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <button type="button" className="flex size-11 shrink-0 items-center justify-center rounded-full text-ink xl:hidden" aria-label={t("navbar.openMenu")}>
            <Menu className="size-7" />
          </button>
        </SheetTrigger>
        <SheetContent className="flex flex-col gap-6 bg-cream p-6">
          <SheetTitle className="sr-only">{t("navbar.main")}</SheetTitle>
          <nav aria-label={t("navbar.main")} className="mt-8 flex flex-col gap-5">
            {mainNav.map((item) => (
              <NavLink key={item.to} to={l(item.to)} end onClick={() => setOpen(false)} className={linkClass}>
                {t(`navbar.${item.key}`)}
              </NavLink>
            ))}
          </nav>
          <LanguagePills onSwitch={() => setOpen(false)} />
          <Button asChild variant="clay" size="pill" className="self-start">
            <Link to={l("/tarifs")} onClick={() => setOpen(false)}>
              {t("navbar.book")}
            </Link>
          </Button>
        </SheetContent>
      </Sheet>
    </header>
  );
}
