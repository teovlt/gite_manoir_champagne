import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useSiteData } from "@/providers/site-data-provider";
import { useLocalePath, useTr } from "@/lib/locale";

export const telHref = (phone: string) => `tel:${phone.replace(/\(0\)/g, "").replace(/[^\d+]/g, "")}`;

const FooterLink = ({ to, children }: { to: string; children: React.ReactNode }) => {
  const l = useLocalePath();
  return to.startsWith("/") ? (
    <Link to={l(to)} className="text-taupe hover:text-clay">
      {children}
    </Link>
  ) : (
    <a href={to} className="text-taupe hover:text-clay" target={to.startsWith("http") ? "_blank" : undefined} rel="noreferrer">
      {children}
    </a>
  );
};

const Column = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div>
    <h3 className="mb-4 text-[13px] uppercase tracking-[1px] text-ink">{title}</h3>
    <div className="flex flex-col gap-2.5 text-sm">{children}</div>
  </div>
);

export function SiteFooter() {
  const { t } = useTranslation();
  const tr = useTr();
  const { data } = useSiteData();
  const { phone, address, abritelUrl } = data.settings;
  const [street, city] = address.split(/,\s*/);

  return (
    <footer className="px-gutter border-t-[3px] border-sage bg-sand pb-8 pt-[72px] text-umber">
      <div className="mx-auto grid max-w-[1200px] grid-cols-[repeat(auto-fit,minmax(min(200px,100%),1fr))] gap-10 border-b border-[#E3D5B0] pb-12">
        <div>
          <span className="font-serif text-xl text-ink">Manoir de la Champagne</span>
          <p className="mt-4 text-sm leading-[1.7] text-taupe">
            {street}
            <br />
            {city}, Manche
            <br />
            {t("footer.region")}
          </p>
          <p className="mt-3 text-sm">
            <a href={telHref(phone)} className="text-clay">
              {phone}
            </a>
          </p>
        </div>
        <Column title={t("footer.explore")}>
          {data.navLinks.map((link) => (
            <FooterLink key={`${link.label.fr}-${link.href}`} to={link.href}>
              {tr(link.label)}
            </FooterLink>
          ))}
        </Column>
        <Column title={t("footer.book")}>
          <FooterLink to="/tarifs">{t("footer.pricing")}</FooterLink>
          <FooterLink to="/contact">{t("footer.contact")}</FooterLink>
          {abritelUrl && <FooterLink to={abritelUrl}>{t("footer.abritel")} ↗</FooterLink>}
        </Column>
        <Column title={t("footer.practical")}>
          <FooterLink to="/mentions-legales">{t("footer.legal")}</FooterLink>
          <FooterLink to="/confidentialite">{t("footer.privacy")}</FooterLink>
          <FooterLink to="/plan-du-site">{t("footer.sitemap")}</FooterLink>
        </Column>
      </div>
      <div className="mx-auto flex max-w-[1200px] flex-wrap justify-between gap-3 pt-6 text-xs text-stone">
        <span>© {new Date().getFullYear()} Manoir de la Champagne — Loïc &amp; Maryline Courteille</span>
        <span>{t("footer.rating")}</span>
      </div>
    </footer>
  );
}
