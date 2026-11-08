import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { Check, ChevronDown, Menu } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { LANGS, langLabels, localize, stripLang, useLang, useLocalePath } from "@/lib/locale";
import { cn } from "@/lib/utils";
import { Flag } from "./flags";
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

/** Language select (flag + code, opens the three choices): keeps the current page and its query string. */
export const LanguageSelect = ({ onSwitch, full = false }: { onSwitch?: () => void; full?: boolean }) => {
  const { t } = useTranslation();
  const lang = useLang();
  const { pathname, search } = useLocation();
  const base = stripLang(pathname);

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger
        aria-label={`${t("navbar.language")} : ${langLabels[lang]}`}
        className={cn(
          "group flex items-center gap-2 rounded-full border border-line-strong bg-cream py-[5px] pl-[5px] pr-2.5 text-[12px] font-semibold uppercase tracking-[0.6px] text-ink shadow-[0_1px_3px_rgba(43,42,37,0.06)] outline-none transition-[border-color,box-shadow,background-color] hover:border-khaki hover:bg-sand focus-visible:ring-[3px] focus-visible:ring-sage/50 data-[state=open]:border-khaki data-[state=open]:bg-sand",
          full && "w-full max-w-[260px] py-2 pl-2 pr-3.5 text-[13px] normal-case tracking-normal",
        )}
      >
        <Flag lang={lang} className={full ? "size-6" : "size-5"} />
        <span>{full ? langLabels[lang] : lang}</span>
        <ChevronDown
          className="ml-auto size-3.5 text-stone transition-transform duration-300 group-data-[state=open]:rotate-180"
          aria-hidden="true"
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={full ? "start" : "end"}
        sideOffset={8}
        className="z-[60] min-w-[184px] rounded-[14px] border-line-strong bg-cream p-1.5 shadow-[0_14px_34px_rgba(43,42,37,0.16)]"
      >
        {LANGS.map((l) => {
          const active = l === lang;
          return (
            <DropdownMenuItem
              key={l}
              asChild
              className="group/item cursor-pointer gap-3 rounded-[10px] px-2.5 py-2 text-[14px] text-ink focus:bg-wheat focus:text-ink"
            >
              <Link
                to={`${localize(base, l)}${search}`}
                hrefLang={l}
                lang={l}
                aria-current={active ? "true" : undefined}
                onClick={() => {
                  try {
                    localStorage.setItem("lang", l);
                  } catch {
                    /* ignore */
                  }
                  onSwitch?.();
                }}
              >
                <Flag lang={l} className="size-5 transition-transform duration-300 group-focus/item:scale-110" />
                <span className={cn("flex-1", active && "font-semibold")}>{langLabels[l]}</span>
                {active ? (
                  <Check className="size-4 text-sage-dark" aria-hidden="true" />
                ) : (
                  <span className="text-[11px] uppercase tracking-[0.6px] text-pebble">{l}</span>
                )}
              </Link>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
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
        <LanguageSelect />
        <Button asChild variant="clay" size="pill">
          <Link to={l("/tarifs")}>{t("navbar.book")}</Link>
        </Button>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <button
            type="button"
            className="flex size-11 shrink-0 items-center justify-center rounded-full text-ink xl:hidden"
            aria-label={t("navbar.openMenu")}
          >
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
          <LanguageSelect full onSwitch={() => setOpen(false)} />
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
