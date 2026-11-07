import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { formatDay, parseDate } from "@/lib/format";
import { localize, type Lang, type Translated } from "@/lib/locale";

interface BannerEvent {
  title: Partial<Translated>;
  text: Partial<Translated>;
  link: string;
  startDate: string;
  endDate: string;
}

/** Presentational banner — also used by the admin preview (with an explicit lang). */
export function EventBannerView({ event, lang }: { event: BannerEvent; lang: Lang }) {
  const { t } = useTranslation(undefined, { lng: lang });
  const pick = (v: Partial<Translated>) => v[lang] || v.fr || "";
  const sameMonth = event.startDate && event.endDate && parseDate(event.startDate).getMonth() === parseDate(event.endDate).getMonth();
  const start = event.startDate ? (sameMonth && lang !== "de" ? String(parseDate(event.startDate).getDate()) : formatDay(event.startDate, lang)) : "";
  const period = event.startDate && event.endDate ? `, ${t("banner.period", { start, end: formatDay(event.endDate, lang) })}` : "";
  const text = pick(event.text);

  return (
    <div className="px-gutter flex flex-wrap items-center justify-center gap-2.5 bg-ink py-2.5 text-center text-[13px] text-cream">
      <span className="shrink-0 rounded-full bg-clay px-[9px] py-[3px] text-[10px] font-semibold uppercase tracking-[1px] text-cream">{t("banner.badge")}</span>
      <span>
        {pick(event.title)}
        {text && (
          <>
            {" — "}
            <strong>{text}</strong>
          </>
        )}
        {period}.
      </span>
      {event.link && (
        <Link to={localize(event.link, lang)} className="shrink-0 font-semibold text-wheat-light underline hover:text-cream">
          {t("banner.cta")}
        </Link>
      )}
    </div>
  );
}
