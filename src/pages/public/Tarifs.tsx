import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageHero } from "@/components/site/page-hero";
import { Accent } from "@/components/site/ornaments";
import { Field, TextAreaField, contactUrl, validateBooking } from "@/components/site/form-controls";
import { usePageText, useSiteData } from "@/providers/site-data-provider";
import { formatPrice, lines } from "@/lib/format";
import { cn } from "@/lib/utils";

function AvailabilityForm() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [v, setV] = useState({ arrivee: "", depart: "", adultes: "", enfants: "", message: "" });
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setV({ ...v, [k]: e.target.value });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const error = validateBooking(v);
    if (error) return toast.error(t(error));
    // Name & e-mail are collected on the contact page, which is pre-filled with these values.
    navigate(contactUrl(v));
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-5 rounded-[18px] bg-sand p-[clamp(20px,4vw,36px)]">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(200px,100%),1fr))] gap-5">
        <Field id="arrivee" label={t("booking.arrival")} type="date" value={v.arrivee} onChange={set("arrivee")} />
        <Field id="depart" label={t("booking.departure")} type="date" min={v.arrivee} value={v.depart} onChange={set("depart")} />
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(200px,100%),1fr))] gap-5">
        <Field id="adultes" label={t("booking.adults")} type="number" min="1" placeholder="2" value={v.adultes} onChange={set("adultes")} />
        <Field id="enfants" label={t("booking.children")} type="number" min="0" placeholder="0" value={v.enfants} onChange={set("enfants")} />
      </div>
      <TextAreaField id="message" label="Message (option spa, questions…)" rows={3} value={v.message} onChange={set("message")} />
      <Button type="submit" variant="clay" size="pillMd" className="self-start px-8">
        Demander la disponibilité
      </Button>
    </form>
  );
}

export function Tarifs() {
  const text = usePageText("tarifs");
  const { pricing } = useSiteData().data;
  const [arrivalTitle, ...arrivalLines] = ["Arrivée / départ —", ...lines(text("arrivals"))];

  return (
    <>
      <PageHero eyebrow="Réservation" title="Tarifs & conditions" minHeight={380} />

      <section className="px-gutter pb-6 pt-16">
        <div className="mx-auto flex max-w-[1100px] flex-wrap gap-10">
          <p className="flex-[1_1_320px] text-[15px] leading-[1.75] text-ink-soft">
            <strong>{arrivalTitle}</strong>
            {arrivalLines.map((l) => (
              <span key={l}>
                <br />
                {l}
              </span>
            ))}
            <br />
            <span className="text-stone">Pour d'autres dates d'arrivée, nous contacter.</span>
          </p>
          <p className="flex-[1_1_320px] text-[15px] leading-[1.75] text-ink-soft">
            <strong>Inclus dans le tarif —</strong>
            <br />
            {text("included")}
          </p>
        </div>
      </section>

      <section className="px-gutter pb-16 pt-10">
        <div className="mx-auto max-w-[1100px]">
          <h2 className="mb-3 font-serif text-[26px] font-medium">Grille tarifaire</h2>
          <Accent className="mb-5" />
          <div className="overflow-x-auto rounded-[14px] border border-line">
            <table className="w-full min-w-[620px] border-collapse text-left text-sm">
              <thead>
                <tr className="bg-wheat text-ink">
                  <th className="px-5 py-3.5 font-semibold">Formule</th>
                  <th className="px-5 py-3.5 font-semibold">Durée</th>
                  <th className="px-5 py-3.5 font-semibold">Tarif selon saison</th>
                </tr>
              </thead>
              <tbody>
                {pricing.formulas.map((f, i) => (
                  <tr key={f.id} className={cn("border-t border-line", i % 2 === 1 && "bg-sand")}>
                    <td className="px-5 py-3.5 font-semibold">{f.name}</td>
                    <td className="px-5 py-3.5 text-ink-soft">{f.duration}</td>
                    <td className="px-5 py-3.5 text-ink-soft">
                      {formatPrice(f.low)} à {formatPrice(f.high)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-[13px] text-stone">{text("gridNote")}</p>

          <div className="mt-7 grid grid-cols-[repeat(auto-fit,minmax(min(220px,100%),1fr))] gap-4">
            {pricing.seasons.map((s) => (
              <div key={s.id} className="rounded-[14px] border border-line px-5 py-4">
                <span className="text-xs font-semibold uppercase tracking-[0.5px] text-clay">{s.name}</span>
                <p className="mt-1.5 text-[13px] text-ink-soft">{s.periods}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-gutter bg-sand pb-20 pt-12">
        <div className="mx-auto grid max-w-[1100px] grid-cols-[repeat(auto-fit,minmax(min(300px,100%),1fr))] gap-10">
          <div>
            <h2 className="mb-4 font-serif text-[22px] font-medium">Suppléments &amp; options</h2>
            <ul className="flex flex-col gap-2.5 text-sm text-ink-soft">
              {pricing.extras.map((x, i) => (
                <li
                  key={x.id}
                  className={cn("flex justify-between gap-3", i < pricing.extras.length - 1 && "border-b border-line-strong pb-2")}
                >
                  <span>{x.label}</span>
                  <strong className="text-right">
                    {formatPrice(x.price)}
                    {x.unit && ` ${x.unit}`}
                  </strong>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="mb-4 font-serif text-[22px] font-medium">Modalités</h2>
            <ul className="flex flex-col gap-3 text-sm text-ink-soft">
              {lines(text("terms")).map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="px-gutter py-20">
        <div className="mx-auto max-w-[760px]">
          <h2 className="mb-3 text-center font-serif text-[26px] font-medium">Demander la disponibilité</h2>
          <p className="mb-9 text-center text-umber">Indiquez vos dates et le nombre de personnes, Loïc et Maryline vous répondent directement.</p>
          <AvailabilityForm />
        </div>
      </section>
    </>
  );
}
