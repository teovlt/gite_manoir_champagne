import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { Menu } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
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

const LanguagePills = () => {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-0.5" role="group" aria-label={t("navbar.language")}>
      <span className="rounded-full bg-wheat px-[9px] py-[5px] text-[11px] font-bold tracking-[0.5px] text-ink" aria-current="true">
        FR
      </span>
      {["EN", "DE"].map((l) => (
        <span key={l} className="px-[9px] py-[5px] text-[11px] font-semibold tracking-[0.5px] text-pebble" title={t("navbar.soon")}>
          {l}
        </span>
      ))}
    </div>
  );
};

export const BrandLink = ({ onClick }: { onClick?: () => void }) => (
  <Link to="/" onClick={onClick} className="flex items-center gap-3 text-ink hover:text-ink">
    <Logo />
    <span className="flex flex-col leading-tight">
      <span className="font-serif text-[21px] font-semibold">Manoir de la Champagne</span>
      <span className="text-[11px] uppercase tracking-[1.5px] text-stone">Millières · Manche</span>
    </span>
  </Link>
);

export function SiteHeader() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "pb-1 text-[13px] uppercase tracking-[1px] hover:text-clay",
      isActive ? "border-b-2 border-clay font-semibold text-ink" : "border-b-2 border-transparent font-medium text-olive",
    );

  return (
    <header className="px-gutter flex flex-wrap items-center justify-between gap-6 border-b border-line bg-cream py-[18px]">
      <BrandLink />

      <nav aria-label={t("navbar.main")} className="hidden flex-wrap gap-[26px] xl:flex">
        {mainNav.map((item) => (
          <NavLink key={item.to} to={item.to} end className={linkClass}>
            {t(`navbar.${item.key}`)}
          </NavLink>
        ))}
      </nav>

      <div className="hidden items-center gap-[18px] sm:flex">
        <LanguagePills />
        <Button asChild variant="clay" size="pill">
          <Link to="/tarifs">{t("navbar.book")}</Link>
        </Button>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <button type="button" className="flex size-11 items-center justify-center rounded-full text-ink xl:hidden" aria-label={t("navbar.openMenu")}>
            <Menu className="size-7" />
          </button>
        </SheetTrigger>
        <SheetContent className="flex flex-col gap-6 bg-cream p-6">
          <SheetTitle className="sr-only">{t("navbar.main")}</SheetTitle>
          <nav aria-label={t("navbar.main")} className="mt-8 flex flex-col gap-5">
            {mainNav.map((item) => (
              <NavLink key={item.to} to={item.to} end onClick={() => setOpen(false)} className={linkClass}>
                {t(`navbar.${item.key}`)}
              </NavLink>
            ))}
          </nav>
          <LanguagePills />
          <Button asChild variant="clay" size="pill" className="self-start">
            <Link to="/tarifs" onClick={() => setOpen(false)}>
              {t("navbar.book")}
            </Link>
          </Button>
        </SheetContent>
      </Sheet>
    </header>
  );
}
