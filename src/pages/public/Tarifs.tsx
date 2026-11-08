import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageHero } from "@/components/site/page-hero";
import { Accent } from "@/components/site/ornaments";
import { Reveal } from "@/components/site/reveal";
import { AvailabilityCalendar } from "@/components/site/availability-calendar";
import { Field, TextAreaField, contactUrl, validateBooking } from "@/components/site/form-controls";
import { useAvailability, usePageText, useSiteData } from "@/providers/site-data-provider";
import { usePageMeta } from "@/lib/use-page-meta";
import { formatPrice, lines, todayISO } from "@/lib/format";
import { useLang, useTr } from "@/lib/locale";
import type { AvailabilityBlock } from "@/lib/types";
import { cn } from "@/lib/utils";

function AvailabilityForm({ blocks, preset }: { blocks: AvailabilityBlock[] | null; preset: { arrivee: string; depart: string } }) {
  const { t } = useTranslation();
  const lang = useLang();
  const navigate = useNavigate();
  const [v, setV] = useState({ arrivee: "", depart: "", adultes: "", enfants: "", message: "" });
  const [lastPreset, setLastPreset] = useState(preset);
  if (preset !== lastPreset) {
    setLastPreset(preset);
    setV((cur) => ({ ...cur, ...preset }));
  }
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setV({ ...v, [k]: e.target.value });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const error = validateBooking(v, blocks);
    if (error) return toast.error(t(error));
    // Name & e-mail are collected on the contact page, which is pre-filled with these values.
    navigate(contactUrl(v, lang));
  };

  return (
    <form id="demande" onSubmit={submit} className="flex scroll-mt-28 flex-col gap-5 rounded-[18px] bg-sand p-[clamp(20px,4vw,36px)]">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(200px,100%),1fr))] gap-5">
        <Field id="arrivee" label={t("booking.arrival")} type="date" min={todayISO()} value={v.arrivee} onChange={set("arrivee")} />
        <Field id="depart" label={t("booking.departure")} type="date" min={v.arrivee || todayISO()} value={v.depart} onChange={set("depart")} />
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(200px,100%),1fr))] gap-5">
        <Field id="adultes" label={t("booking.adults")} type="number" min="1" max="14" placeholder="2" value={v.adultes} onChange={set("adultes")} />
        <Field id="enfants" label={t("booking.children")} type="number" min="0" max="13" placeholder="0" value={v.enfants} onChange={set("enfants")} />
      </div>
      <TextAreaField id="message" label={t("tarifs.message")} rows={3} value={v.message} onChange={set("message")} />
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
  const [preset, setPreset] = useState({ arrivee: "", depart: "" });
  usePageMeta({ title: t("tarifs.title"), description: text("included") });

  const choose = (arrivee: string, depart: string) => {
    setPreset({ arrivee, depart });
    document.getElementById("demande")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      <PageHero eyebrow={t("tarifs.eyebrow")} title={t("tarifs.title")} photoSlot="jardins.sud" minHeight={400} />

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
                    <td className="px-5 py-3.5 text-ink-soft">{t("tarifs.range", { low: formatPrice(f.low, lang), high: formatPrice(f.high, lang) })}</td>
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

      <section className="px-gutter bg-sand pb-20 pt-12">
        <Reveal className="mx-auto grid max-w-[1100px] grid-cols-[repeat(auto-fit,minmax(min(300px,100%),1fr))] gap-10">
          <div>
            <h2 className="mb-4 font-serif text-[22px] font-medium">{t("tarifs.extras")}</h2>
            <ul className="flex flex-col gap-2.5 text-sm text-ink-soft">
              {pricing.extras.map((x, i) => (
                <li key={x.id} className={cn("flex justify-between gap-3", i < pricing.extras.length - 1 && "border-b border-line-strong pb-2")}>
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
