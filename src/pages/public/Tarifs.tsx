import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageHero } from "@/components/site/page-hero";
import { Accent } from "@/components/site/ornaments";
import { Reveal } from "@/components/site/reveal";
import { SitePhoto } from "@/components/site/site-photo";
import { AvailabilityCalendar } from "@/components/site/availability-calendar";
import { TextAreaField, contactUrl, fieldInputClass, validateBooking } from "@/components/site/form-controls";
import { DateRangeField, GuestFields } from "@/components/site/booking-fields";
import { useAvailability, usePageText, useSiteData } from "@/providers/site-data-provider";
import { usePageMeta } from "@/lib/use-page-meta";
import { formatPrice, lines } from "@/lib/format";
import { useLang, useTr } from "@/lib/locale";
import type { AvailabilityBlock } from "@/lib/types";
import { cn } from "@/lib/utils";

const formBoxClass = cn(fieldInputClass, "h-12");

function AvailabilityForm({ blocks, preset }: { blocks: AvailabilityBlock[] | null; preset: { arrivee: string; depart: string } }) {
  const { t } = useTranslation();
  const lang = useLang();
  const navigate = useNavigate();
  const [v, setV] = useState({ arrivee: "", depart: "", adultes: 2, enfants: 0, message: "" });
  const [lastPreset, setLastPreset] = useState(preset);
  if (preset !== lastPreset) {
    setLastPreset(preset);
    setV((cur) => ({ ...cur, ...preset }));
  }
  const values = { ...v, adultes: String(v.adultes), enfants: String(v.enfants) };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const error = validateBooking(values, blocks);
    if (error) return toast.error(t(error));
    // Name & e-mail are collected on the contact page, which is pre-filled with these values.
    navigate(contactUrl(values, lang));
  };

  return (
    <form id="demande" onSubmit={submit} className="flex scroll-mt-28 flex-col gap-5 rounded-[18px] bg-sand p-[clamp(20px,4vw,36px)]">
      <DateRangeField
        blocks={blocks}
        arrival={v.arrivee}
        departure={v.depart}
        onChange={(arrivee, depart) => setV((cur) => ({ ...cur, arrivee, depart }))}
        boxClassName={formBoxClass}
        idPrefix="t"
        className="gap-x-5"
      />
      <div className="grid grid-cols-2 gap-5">
        <GuestFields
          adults={v.adultes}
          children={v.enfants}
          onChange={(adultes, enfants) => setV((cur) => ({ ...cur, adultes, enfants }))}
          boxClassName={formBoxClass}
          idPrefix="t"
        />
      </div>
      <TextAreaField
        id="message"
        label={t("tarifs.message")}
        rows={3}
        value={v.message}
        onChange={(e) => setV({ ...v, message: e.target.value })}
      />
      <Button type="submit" variant="clay" size="pillMd" className="self-start px-8">
        {t("tarifs.ask")}
      </Button>
    </form>
  );
}

export function Tarifs() {
  const { t } = useTranslation();
  const lang = useLang();
  const tr = useTr();
  const text = usePageText("tarifs");
  const { pricing } = useSiteData().data;
  const blocks = useAvailability();
  const spaPrices = pricing.extras.filter((x) => x.id.startsWith("spa"));
  const extras = pricing.extras.filter((x) => !x.id.startsWith("spa"));
  const [preset, setPreset] = useState({ arrivee: "", depart: "" });
  usePageMeta();

  const choose = (arrivee: string, depart: string) => {
    setPreset({ arrivee, depart });
    document.getElementById("demande")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      <PageHero
        eyebrow={t("tarifs.eyebrow")}
        title={t("tarifs.title")}
        photoSlot="jardins.terrasse"
        sideSlots={["gite.hero", "gite.familiale"]}
        minHeight={400}
      />

      <section className="px-gutter pb-6 pt-16">
        <Reveal className="mx-auto flex max-w-[1100px] flex-wrap gap-10">
          <p className="flex-[1_1_320px] text-[15px] leading-[1.75] text-ink-soft">
            <strong>{t("tarifs.arrivals")}</strong>
            {lines(text("arrivals")).map((line) => (
              <span key={line}>
                <br />
                {line}
              </span>
            ))}
            <br />
            <span className="text-stone">{t("tarifs.otherDates")}</span>
          </p>
          <p className="flex-[1_1_320px] text-[15px] leading-[1.75] text-ink-soft">
            <strong>{t("tarifs.included")}</strong>
            <br />
            {text("included")}
          </p>
        </Reveal>
      </section>

      <section className="px-gutter pb-16 pt-10">
        <div className="mx-auto max-w-[1100px]">
          <h2 className="mb-3 font-serif text-[26px] font-medium">{t("tarifs.grid")}</h2>
          <Accent className="mb-5" />
          <Reveal className="overflow-x-auto rounded-[14px] border border-line">
            <table className="w-full min-w-[620px] border-collapse text-left text-sm">
              <thead>
                <tr className="bg-wheat text-ink">
                  <th className="px-5 py-3.5 font-semibold">{t("tarifs.formula")}</th>
                  <th className="px-5 py-3.5 font-semibold">{t("tarifs.duration")}</th>
                  <th className="px-5 py-3.5 font-semibold">{t("tarifs.price")}</th>
                </tr>
              </thead>
              <tbody>
                {pricing.formulas.map((f, i) => (
                  <tr key={f.id} className={cn("border-t border-line transition-colors hover:bg-wheat/50", i % 2 === 1 && "bg-sand")}>
                    <td className="px-5 py-3.5 font-semibold">{tr(f.name)}</td>
                    <td className="px-5 py-3.5 text-ink-soft">{tr(f.duration)}</td>
                    <td className="px-5 py-3.5 text-ink-soft">
                      {t("tarifs.range", { low: formatPrice(f.low, lang), high: formatPrice(f.high, lang) })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Reveal>
          <p className="mt-4 text-[13px] text-stone">{text("gridNote")}</p>

          <div className="mt-7 grid grid-cols-[repeat(auto-fit,minmax(min(220px,100%),1fr))] gap-4">
            {pricing.seasons.map((s, i) => (
              <Reveal key={s.id} delay={i * 70} className="rounded-[14px] border border-line px-5 py-4">
                <span className="text-xs font-semibold uppercase tracking-[0.5px] text-clay">{tr(s.name)}</span>
                <p className="mt-1.5 text-[13px] text-ink-soft">{tr(s.periods)}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {spaPrices.length > 0 && (
        <section id="spa" className="px-gutter scroll-mt-24 pb-16">
          <Reveal className="mx-auto flex max-w-[1100px] flex-wrap items-center gap-x-10 gap-y-6 rounded-[18px] bg-forest p-[clamp(20px,4vw,36px)] text-cream">
            <SitePhoto
              slot="jardins.spa"
              zoomable
              gallery={["jardins.spa", "jardins.pavillon-spa"]}
              className="aspect-[4/3] flex-[1_1_260px] rounded-[14px]"
            />
            <div className="flex-[2_1_360px]">
              <h2 className="mb-2 font-serif text-[26px] font-medium">{t("tarifs.spaTitle")}</h2>
              <p className="mb-5 text-[15px] leading-relaxed text-cream/85">{t("tarifs.spaText")}</p>
              <ul className="grid grid-cols-[repeat(auto-fit,minmax(min(200px,100%),1fr))] gap-2.5">
                {spaPrices.map((x) => (
                  <li key={x.id} className="flex items-baseline justify-between gap-3 rounded-xl bg-cream/[0.08] px-4 py-3">
                    <span className="text-[14px] text-cream/90">{t(`tarifs.spaDurations.${x.id}`, { defaultValue: tr(x.label) })}</span>
                    <strong className="font-serif text-xl font-semibold">{formatPrice(x.price, lang)}</strong>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </section>
      )}

      <section className="px-gutter bg-sand pb-20 pt-12">
        <Reveal className="mx-auto grid max-w-[1100px] grid-cols-[repeat(auto-fit,minmax(min(300px,100%),1fr))] gap-10">
          <div>
            <h2 className="mb-4 font-serif text-[22px] font-medium">{t("tarifs.extras")}</h2>
            <ul className="flex flex-col gap-2.5 text-sm text-ink-soft">
              {extras.map((x, i) => (
                <li key={x.id} className={cn("flex justify-between gap-3", i < extras.length - 1 && "border-b border-line-strong pb-2")}>
                  <span>{tr(x.label)}</span>
                  <strong className="text-right">
                    {formatPrice(x.price, lang)}
                    {tr(x.unit) && ` ${tr(x.unit)}`}
                  </strong>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="mb-4 font-serif text-[22px] font-medium">{t("tarifs.terms")}</h2>
            <ul className="flex flex-col gap-3 text-sm text-ink-soft">
              {lines(text("terms")).map((line) => (
                <li key={line} className="flex gap-2.5 before:mt-[7px] before:size-1.5 before:shrink-0 before:rounded-full before:bg-sage">
                  {line}
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </section>

      <section id="disponibilites" className="px-gutter scroll-mt-24 pt-20">
        <div className="mx-auto max-w-[1100px]">
          <Reveal>
            <h2 className="mb-3 text-center font-serif text-[26px] font-medium">{t("calendar.title")}</h2>
            <p className="mx-auto mb-9 max-w-[640px] text-center text-umber">{t("calendar.subtitle")}</p>
          </Reveal>
          <AvailabilityCalendar blocks={blocks} onRequest={choose} />
        </div>
      </section>

      <section className="px-gutter py-20">
        <div className="mx-auto max-w-[760px]">
          <h2 className="mb-3 text-center font-serif text-[26px] font-medium">{t("tarifs.askTitle")}</h2>
          <p className="mb-9 text-center text-umber">{t("tarifs.askText")}</p>
          <AvailabilityForm blocks={blocks} preset={preset} />
        </div>
      </section>
    </>
  );
}
