import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useCheapestFormula } from "@/components/site/booking-fields";
import { formatPrice } from "@/lib/format";
import { stripLang, useLang, useLocalePath } from "@/lib/locale";
import { cn } from "@/lib/utils";

/** Pages that already carry the booking form. */
const HIDDEN_ON = ["/tarifs", "/contact"];

/** Phone-only bar pinned to the bottom of the screen once the visitor has scrolled past the hero. */
export function MobileBookingCta() {
  const { t } = useTranslation();
  const lang = useLang();
  const l = useLocalePath();
  const { pathname } = useLocation();
  const cheapest = useCheapestFormula();
  const [shown, setShown] = useState(false);
  const enabled = !HIDDEN_ON.includes(stripLang(pathname));

  useEffect(() => {
    // Past the hero (and, on the home page, past the booking bar under it).
    const onScroll = () => setShown(window.scrollY > window.innerHeight * 0.9);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!enabled) return null;

  return (
    <>
      {/* Keeps the end of the footer reachable above the bar. */}
      <div className="h-[76px] md:hidden" aria-hidden="true" />
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-40 border-t border-line-strong bg-cream/95 px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_24px_rgba(43,42,37,0.12)] backdrop-blur transition-transform duration-300 md:hidden",
          shown ? "translate-y-0" : "pointer-events-none translate-y-full",
        )}
        aria-hidden={!shown}
      >
        <div className="flex items-center justify-between gap-3">
          {cheapest && (
            <span className="shrink-0 whitespace-nowrap text-[12px] leading-tight text-umber">
              {t("home.priceFrom")}
              <strong className="block font-serif text-[19px] font-semibold text-clay">{formatPrice(cheapest.low, lang)}</strong>
            </span>
          )}
          <Button asChild variant="clay" size="pill" className="ml-auto shrink-0">
            <Link to={l("/tarifs#disponibilites")} tabIndex={shown ? 0 : -1}>
              {t("home.ctaAvailability")}
            </Link>
          </Button>
        </div>
      </div>
    </>
  );
}
