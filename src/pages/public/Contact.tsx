import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageHero } from "@/components/site/page-hero";
import { Accent } from "@/components/site/ornaments";
import { Reveal } from "@/components/site/reveal";
import { DirectionsPanel, ManorMap } from "@/components/site/lazy-map";
import { Field, TextAreaField, apiErrorKey, fieldInputClass, validateBooking } from "@/components/site/form-controls";
import { DateRangeField, GuestFields } from "@/components/site/booking-fields";
import { telHref } from "@/components/site/site-footer";
import { useAvailability, usePageText, useSiteData } from "@/providers/site-data-provider";
import { usePageMeta } from "@/lib/use-page-meta";
import { ApiError, api } from "@/lib/api";
import { formatDay } from "@/lib/format";
import { useLang, useLocalePath, type Lang } from "@/lib/locale";
import { cn } from "@/lib/utils";

function describeDates(t: TFunction, lang: Lang, arrival: string, departure: string) {
  if (arrival && departure) return t("booking.datesFrom", { start: formatDay(arrival, lang), end: formatDay(departure, lang, true) });
  if (arrival) return t("booking.datesStart", { start: formatDay(arrival, lang, true) });
  return "";
}

const formBoxClass = cn(fieldInputClass, "h-12");

type Kind = "booking" | "question";

function ContactForm() {
  const { t } = useTranslation();
  const lang = useLang();
  const l = useLocalePath();
  const blocks = useAvailability();
  const [params] = useSearchParams();
  const fromBooking = Boolean(params.get("arrivee") || params.get("depart") || params.get("adultes"));

  const [kind, setKind] = useState<Kind>("booking");
  const empty = { nom: "", email: "", arrivee: "", depart: "", adultes: 2, enfants: 0, message: "", website: "" };
  const [v, setV] = useState(() => ({
    ...empty,
    arrivee: params.get("arrivee") ?? "",
    depart: params.get("depart") ?? "",
    adultes: Number(params.get("adultes")) || 2,
    enfants: Number(params.get("enfants")) || 0,
    message: params.get("message") ?? "",
  }));
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const set = (k: "nom" | "email" | "message" | "website") => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setV({ ...v, [k]: e.target.value });
  const booking = kind === "booking";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (booking) {
      if (!v.arrivee || !v.depart) return toast.error(t("contact.datesRequired"));
      const error = validateBooking(
        { arrivee: v.arrivee, depart: v.depart, adultes: String(v.adultes), enfants: String(v.enfants) },
        blocks,
      );
      if (error) return toast.error(t(error));
    }
    setSending(true);
    try {
      await api.post("/api/requests", {
        name: v.nom,
        email: v.email,
        message: v.message,
        website: v.website,
        lang,
        ...(booking && {
          dates: describeDates(t, lang, v.arrivee, v.depart),
          arrival: v.arrivee,
          departure: v.depart,
          adults: v.adultes,
          children: v.enfants,
        }),
      });
      toast.success(t("booking.sent"));
      setSent(true);
      setV(empty);
    } catch (err) {
      const key = err instanceof ApiError ? apiErrorKey[err.message] : undefined;
      toast.error(t(key ?? "booking.error"));
    } finally {
      setSending(false);
    }
  };

  const tab = (id: Kind, label: string) => (
    <button
      type="button"
      role="radio"
      aria-checked={kind === id}
      onClick={() => setKind(id)}
      className={cn(
        "flex-1 rounded-full px-4 py-2.5 text-[13px] font-semibold transition-colors",
        kind === id ? "bg-sage-dark text-cream" : "text-umber hover:text-ink",
      )}
    >
      {label}
    </button>
  );

  return (
    <form
      id="formulaire"
      onSubmit={submit}
      className="flex scroll-mt-28 flex-col gap-[18px] rounded-[18px] bg-sand p-[clamp(20px,4vw,32px)]"
    >
      <div role="radiogroup" aria-label={t("contact.kindLabel")} className="flex gap-1 rounded-full border border-line-strong bg-cream p-1">
        {tab("booking", t("contact.kindBooking"))}
        {tab("question", t("contact.kindQuestion"))}
      </div>
      <p className="rounded-xl border border-line-strong bg-cream px-3.5 py-2.5 text-xs leading-relaxed text-stone" aria-live="polite">
        {sent
          ? t("booking.sent")
          : !booking
            ? t("contact.noteQuestion")
            : fromBooking
              ? t("contact.notePrefilled")
              : t("contact.noteDefault")}
      </p>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(180px,100%),1fr))] gap-[18px]">
        <Field id="nom" label={t("contact.name")} type="text" required autoComplete="name" value={v.nom} onChange={set("nom")} />
        <Field id="email" label={t("contact.email")} type="email" required autoComplete="email" value={v.email} onChange={set("email")} />
      </div>
      {booking && (
        <>
          <DateRangeField
            blocks={blocks}
            arrival={v.arrivee}
            departure={v.depart}
            onChange={(arrivee, depart) => setV((cur) => ({ ...cur, arrivee, depart }))}
            boxClassName={formBoxClass}
            idPrefix="c"
            className="gap-x-[18px]"
          />
          <div className="grid grid-cols-2 gap-[18px]">
            <GuestFields
              adults={v.adultes}
              children={v.enfants}
              onChange={(adultes, enfants) => setV((cur) => ({ ...cur, adultes, enfants }))}
              boxClassName={formBoxClass}
              idPrefix="c"
            />
          </div>
        </>
      )}
      <TextAreaField id="message-c" label={t("contact.message")} rows={4} required value={v.message} onChange={set("message")} />
      <div className="hidden" aria-hidden="true">
        <label htmlFor="website">Website</label>
        <input id="website" tabIndex={-1} autoComplete="off" value={v.website} onChange={set("website")} />
      </div>
      <p className="text-xs text-stone">
        {t("contact.consent")}{" "}
        <Link to={l("/confidentialite")} className="font-semibold text-clay">
          {t("contact.privacyLink")}
        </Link>
      </p>
      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" variant="clay" size="pillMd" className="px-8" disabled={sending}>
          {sending ? t("contact.sending") : t("contact.send")}
        </Button>
        <a
          href="/demande-reservation.pdf"
          download
          className="flex items-center gap-1.5 text-xs tracking-[0.5px] text-umber hover:text-clay"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 3v12" />
            <path d="M7 10l5 5 5-5" />
            <path d="M4 19h16" />
          </svg>
          {t("contact.pdf")}
        </a>
      </div>
    </form>
  );
}

export function Contact() {
  const { t } = useTranslation();
  const text = usePageText("contact");
  const { phone, address } = useSiteData().data.settings;
  const [street, city] = address.split(/,\s*/);
  const share = typeof window !== "undefined" ? window.location.origin : "";
  usePageMeta();

  return (
    <>
      <PageHero eyebrow={t("contact.eyebrow")} title={t("contact.title")} photoSlot="jardins.porche" minHeight={380} />

      <section className="px-gutter py-20">
        <div className="mx-auto grid max-w-[1200px] grid-cols-[repeat(auto-fit,minmax(min(360px,100%),1fr))] gap-14">
          <Reveal>
            <h2 className="mb-5 font-serif text-2xl font-medium">{t("contact.owners")}</h2>
            <p className="mb-6 text-[15px] leading-[1.8] text-ink-soft">{text("intro")}</p>
            <div className="flex flex-col gap-3.5 text-[15px] text-ink">
              <span>
                <strong>{t("contact.address")}&nbsp;:</strong>
                <br />
                {street}
                <br />
                {city}, Manche
                <br />
                {t("footer.region")}
              </span>
              <span>
                <strong>{t("contact.phone")}&nbsp;:</strong>{" "}
                <a href={telHref(phone)} className="text-clay">
                  {phone}
                </a>
              </span>
              <span>
                <strong>{t("contact.email")}&nbsp;:</strong>{" "}
                <a href="#formulaire" className="text-clay">
                  {t("contact.emailVia")}
                </a>
              </span>
            </div>
            <div className="mt-7 flex flex-wrap gap-3">
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(share)}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-line-strong px-3.5 py-2 text-xs text-umber hover:border-clay hover:text-clay"
              >
                {t("contact.shareFacebook")}
              </a>
              <a
                href={`mailto:?subject=${encodeURIComponent("Manoir de la Champagne")}&body=${encodeURIComponent(share)}`}
                className="rounded-full border border-line-strong px-3.5 py-2 text-xs text-umber hover:border-clay hover:text-clay"
              >
                {t("contact.shareEmail")}
              </a>
            </div>
          </Reveal>

          <ContactForm />
        </div>
      </section>

      <section id="acces" className="flex scroll-mt-20 flex-wrap">
        <ManorMap className="aspect-[4/3] min-h-[340px] flex-[1_1_480px]" />
        <div className="px-gutter flex flex-[1_1_480px] flex-col justify-center gap-4 bg-sand py-16">
          <h2 className="font-serif text-2xl font-medium">{t("contact.howTo")}</h2>
          <Accent />
          <ul className="flex flex-col gap-3 text-[15px] text-ink-soft">
            <li>
              <strong>{t("contact.byCar")}&nbsp;:</strong> {text("byCar")}
            </li>
            <li>
              <strong>{t("contact.byTrain")}&nbsp;:</strong> {text("byTrain")}
            </li>
            <li>
              <strong>{t("contact.bySea")}&nbsp;:</strong> {text("bySea")}
            </li>
          </ul>
          <DirectionsPanel />
          <p className="mt-2 text-[13px] text-stone">{t("contact.planNote")}</p>
        </div>
      </section>
    </>
  );
}
