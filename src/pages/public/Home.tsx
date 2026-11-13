import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ArrowUpRight, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EventBannerView } from "@/components/site/event-banner";
import { Accent, Eyebrow, SageStripe, SectionTitle } from "@/components/site/ornaments";
import { PhotoGrid, SitePhoto } from "@/components/site/site-photo";
import { Reveal } from "@/components/site/reveal";
import { ManorMap } from "@/components/site/lazy-map";
import { contactUrl, validateBooking } from "@/components/site/form-controls";
import { DateRangeField, GuestFields, useCheapestFormula } from "@/components/site/booking-fields";
import { GoogleG, Stars, formatRating } from "@/components/site/reviews";
import { AbritelMark, ReviewMarquee, mergeReviews, reviewStats } from "@/components/site/review-wall";
import googleReviews from "@shared/google-reviews.json";
import { useAvailability, useExtraPhotos, usePageText, usePhoto, useSiteData } from "@/providers/site-data-provider";
import { usePageMeta } from "@/lib/use-page-meta";
import { Typo, formatPrice } from "@/lib/format";
import { useLang, useLocalePath, useTr } from "@/lib/locale";
import { officialSites } from "@/lib/region-links";
import { cn } from "@/lib/utils";

const highlightIcons = [
  <>
    <path d="M2 17h20" />
    <path d="M4 17v-5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v5" />
    <path d="M4 12h3a1 1 0 0 0 1-1v-1a1 1 0 0 0-1-1H5" />
    <path d="M2 21v-2M22 21v-2" />
  </>,
  <>
    <path d="M3 17c1.5-1.5 3-1.5 4.5 0s3 1.5 4.5 0 3-1.5 4.5 0 3 1.5 4.5 0" />
    <path d="M3 21c1.5-1.5 3-1.5 4.5 0s3 1.5 4.5 0 3-1.5 4.5 0 3 1.5 4.5 0" />
    <circle cx="9" cy="7" r="1" />
    <circle cx="14" cy="5" r="1" />
    <circle cx="12" cy="10" r="1" />
  </>,
  <>
    <path d="M20 4c-9 0-16 7-16 16 9 0 16-7 16-16z" />
    <path d="M4 20c4-4 8-8 16-16" />
  </>,
  <>
    <path d="M2 14c4-6 14-6 18 0-4 6-14 6-18 0z" />
    <path d="M20 14l3-3v6l-3-3z" />
    <circle cx="7" cy="13" r="0.9" fill="currentColor" stroke="none" />
  </>,
  <path d="M12 3c2 3-1 4-1 7 0 1.5 1 2 2 2 1.5 0 2.5-1.3 2-3 2.5 1.5 4 4 4 7a7 7 0 1 1-14 0c0-3 1.5-5 3-6.5-0.5 1.5 0 2.5 1 2.5 1.5 0 1-2 0-4.5C8 6 9.5 4 12 3z" />,
  <>
    <path d="M3 11l9-7 9 7" />
    <path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" />
  </>,
];

const gallerySlots = ["accueil.hero", "gite.salon", "gite.marquise", "jardins.glycine", "jardins.etang", "jardins.porche"];
const teaserSlots = ["region.mont", "region.debarquement", "region.barfleur"];

const bookingBoxClass =
  "h-12 w-full min-w-0 rounded-xl border border-line-strong bg-sand px-3 py-3 font-sans text-sm sm:px-3.5 text-ink outline-none transition-shadow focus-visible:border-sage-dark focus-visible:ring-[3px] focus-visible:ring-sage/40";

function BookingBar() {
  const { t } = useTranslation();
  const lang = useLang();
  const tr = useTr();
  const l = useLocalePath();
  const navigate = useNavigate();
  const blocks = useAvailability();
  const cheapest = useCheapestFormula();
  const [v, setV] = useState({ arrivee: "", depart: "", adultes: 2, enfants: 0 });
  const values = { ...v, adultes: String(v.adultes), enfants: String(v.enfants) };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const error = validateBooking(values, blocks);
    if (error) return toast.error(t(error));
    if (v.arrivee && v.depart) toast.success(t("booking.available"));
    navigate(contactUrl(values, lang));
  };

  return (
    <div className="px-gutter relative z-[3] mx-auto -mt-14 max-w-[1100px] animate-in fade-in-0 slide-in-from-bottom-6 duration-700">
      <form
        onSubmit={submit}
        className="grid grid-cols-2 items-end gap-x-3 gap-y-4 rounded-[18px] bg-cream px-[clamp(18px,3vw,32px)] pb-6 pt-5 shadow-[0_14px_34px_rgba(43,42,37,0.2)] sm:gap-x-4 md:grid-cols-4 md:pb-7 lg:grid-cols-[2.4fr_1fr_1fr_auto] lg:gap-x-5"
      >
        <div className="col-span-full flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 border-b border-line pb-3.5 text-[13px] text-umber">
          {cheapest && (
            <Link to={l("/tarifs")} className="hover:text-ink">
              {t("home.priceFrom")}{" "}
              <strong className="font-serif text-[17px] font-semibold text-clay">{formatPrice(cheapest.low, lang)}</strong>{" "}
              <span className="text-stone">· {tr(cheapest.name)}</span>
            </Link>
          )}
          <Link to={l("/avis")} className="flex items-center gap-2 hover:text-ink">
            <GoogleG className="size-4" />
            <Stars value={googleReviews.rating} className="text-[13px]" />
            <span>
              <strong className="text-ink">{formatRating(googleReviews.rating, lang)}</strong> ·{" "}
              {t("avis.reviewCount", { count: googleReviews.count })}
            </span>
          </Link>
        </div>
        <DateRangeField
          blocks={blocks}
          arrival={v.arrivee}
          departure={v.depart}
          onChange={(arrivee, depart) => setV((cur) => ({ ...cur, arrivee, depart }))}
          boxClassName={bookingBoxClass}
          labelClassName="text-[11px]"
          idPrefix="b"
          className="col-span-2 lg:col-span-1"
        />
        <GuestFields
          adults={v.adultes}
          children={v.enfants}
          onChange={(adultes, enfants) => setV((cur) => ({ ...cur, adultes, enfants }))}
          boxClassName={bookingBoxClass}
          labelClassName="text-[11px]"
          idPrefix="b"
        />
        <Button
          type="submit"
          variant="clay"
          size="pillMd"
          className="col-span-2 h-12 w-full rounded-xl md:col-span-4 lg:col-span-1 lg:w-auto"
        >
          {t("booking.check")}
        </Button>
      </form>
      <p className="mt-2.5 text-center text-xs text-stone">
        {t("home.bookingNote")}{" "}
        <a href="/demande-reservation.pdf" download className="font-semibold text-clay">
          {t("home.bookingPdf")}
        </a>
        .
      </p>
    </div>
  );
}

/** Bouncing arrow that scrolls past the hero to the first section. */
function ScrollHint({ targetId }: { targetId: string }) {
  const { t } = useTranslation();
  return (
    <div className="mt-auto flex justify-center pb-6 pt-4 lg:pb-[clamp(12px,2.5vh,28px)] lg:pt-3">
      <button
        type="button"
        onClick={() => document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "start" })}
        aria-label={t("home.scrollDown")}
        className="scroll-hint flex size-11 lg:size-10 items-center justify-center rounded-full border border-line-strong bg-cream text-clay shadow-[0_6px_16px_rgba(43,42,37,0.12)] transition-colors hover:bg-clay hover:text-cream focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-sage/50"
      >
        <ChevronDown className="size-5" aria-hidden="true" />
      </button>
    </div>
  );
}

function HomeReviews() {
  const { t } = useTranslation();
  const lang = useLang();
  const tr = useTr();
  const l = useLocalePath();
  const text = usePageText("accueil");
  const { google, abritel } = reviewStats;
  // A single slim row of the shorter reviews: the full wall lives on the reviews page.
  const picks = mergeReviews().filter((r) => tr(r.text).length < 260);

  return (
    <section className="bg-sand py-16">
      <Reveal className="px-gutter mx-auto mb-8 flex max-w-[1200px] flex-wrap items-end justify-between gap-x-10 gap-y-5">
        <div className="max-w-[620px]">
          <p className="font-serif text-[22px] italic leading-normal">
            <span className="mr-1 font-serif text-[34px] leading-none text-clay" aria-hidden="true">
              “
            </span>
            {text("quote")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[13px] text-umber">
          <a
            href={google.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-line-strong bg-cream px-4 py-2 transition-shadow hover:text-ink hover:shadow-[0_8px_20px_rgba(43,42,37,0.1)]"
          >
            <GoogleG className="size-4" />
            <strong className="font-serif text-[17px] font-medium text-ink">{formatRating(google.rating, lang)}</strong>
            <span>· {t("avis.reviewCount", { count: google.count })}</span>
          </a>
          <Link
            to={l("/avis")}
            className="inline-flex items-center gap-2 rounded-full border border-line-strong bg-cream px-4 py-2 transition-shadow hover:text-ink hover:shadow-[0_8px_20px_rgba(43,42,37,0.1)]"
          >
            <AbritelMark />
            <strong className="font-serif text-[17px] font-medium text-ink">{abritel.rating}/10</strong>
            <span>· {t("avis.reviewCount", { count: abritel.count })}</span>
          </Link>
        </div>
      </Reveal>
      <ReviewMarquee reviews={picks} compact secondsPerCard={6} />
      <div className="mt-8 text-center">
        <Button asChild variant="clay" size="pillMd">
          <Link to={l("/avis")}>{t("home.readReviews")}</Link>
        </Button>
      </div>
    </section>
  );
}

const PortraitIllustration = ({ className, label }: { className?: string; label: string }) => (
  <div className={cn("relative overflow-hidden", className)}>
    <svg viewBox="0 0 320 320" className="absolute inset-0 block h-full w-full" aria-hidden="true">
      <rect width="320" height="320" fill="#F1E6CC" />
      <circle cx="300" cy="20" r="130" fill="#EADFC2" />
      <rect x="0" y="258" width="320" height="62" fill="#DBC89E" opacity="0.55" />
      <path d="M86 258 C86 206 101 182 125 182 C149 182 164 206 164 258 Z" fill="#A8B89C" />
      <circle cx="125" cy="141" r="29" fill="#A8B89C" />
      <path d="M157 258 C157 201 171 177 194 177 C217 177 231 201 231 258 Z" fill="#7E9574" />
      <circle cx="194" cy="133" r="27" fill="#7E9574" />
    </svg>
    <span className="absolute bottom-2.5 left-2.5 rounded-[10px] bg-ink/45 px-[9px] py-1 text-[10px] uppercase tracking-[0.5px] text-cream">
      {label}
    </span>
  </div>
);

/** The outdoor spa, guests' favourite: shown high on the page with its price. */
function SpaFeature() {
  const { t } = useTranslation();
  const lang = useLang();
  const tr = useTr();
  const l = useLocalePath();
  const { data } = useSiteData();
  const spaPrices = data.pricing.extras.filter((x) => x.id.startsWith("spa"));
  const points = t("home.spa.points") as unknown as { value: string; label: string }[];
  const spaSlots = ["jardins.spa", "jardins.pavillon-spa"];

  return (
    <section className="px-gutter relative overflow-hidden bg-forest py-24 text-cream">
      <div className="pointer-events-none absolute -right-40 -top-40 size-[520px] rounded-full bg-sage/20 blur-3xl" aria-hidden="true" />
      <div className="relative mx-auto flex max-w-[1200px] flex-wrap items-center gap-x-16 gap-y-12">
        <Reveal className="relative flex-[1_1_460px] pb-16 pr-10 sm:pb-20 sm:pr-16">
          <SitePhoto
            slot="jardins.spa"
            zoomable
            gallery={spaSlots}
            className="aspect-[4/3] w-full rounded-[16px] shadow-[0_24px_60px_rgba(0,0,0,0.45)]"
          />
          <SitePhoto
            slot="jardins.pavillon-spa"
            zoomable
            className="absolute bottom-0 right-0 aspect-[4/3] w-[48%] rounded-[14px] border-4 border-forest shadow-[0_16px_40px_rgba(0,0,0,0.5)]"
          />
        </Reveal>
        <Reveal delay={120} className="flex-[1_1_380px]">
          <span className="text-[13px] font-semibold uppercase tracking-[2px] text-wheat-light">{t("home.spa.eyebrow")}</span>
          <Accent className="mt-4" />
          <h2 className="mb-5 mt-4 font-serif text-[clamp(30px,3.8vw,44px)] font-medium leading-[1.1]">{t("home.spa.title")}</h2>
          <p className="mb-8 text-base leading-[1.75] text-[#F6EEDC]">{t("home.spa.text")}</p>
          <dl className="mb-8 grid grid-cols-3 gap-4 border-y border-cream/15 py-5">
            {points.map((p) => (
              <div key={p.label}>
                <dt className="sr-only">{p.label}</dt>
                <dd className="font-serif text-[clamp(24px,3vw,32px)] font-semibold leading-none text-wheat-light">{p.value}</dd>
                <dd className="mt-1.5 text-[12px] uppercase tracking-[1px] text-cream/70">{p.label}</dd>
              </div>
            ))}
          </dl>
          {spaPrices.length > 0 && (
            <div className="mb-8">
              <p className="mb-3 text-[13px] font-semibold uppercase tracking-[1px] text-wheat-light">{t("home.spa.pricesTitle")}</p>
              <ul className="grid grid-cols-[repeat(auto-fit,minmax(min(200px,100%),1fr))] gap-2.5">
                {spaPrices.map((x) => (
                  <li key={x.id} className="flex items-baseline justify-between gap-3 rounded-xl bg-cream/[0.08] px-4 py-3">
                    <span className="text-[14px] text-cream/90">{t(`tarifs.spaDurations.${x.id}`, { defaultValue: tr(x.label) })}</span>
                    <strong className="font-serif text-xl font-semibold text-cream">{formatPrice(x.price, lang)}</strong>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="flex flex-wrap gap-4">
            <Button asChild variant="clay" size="pillMd">
              <Link to={l("/contact")}>{t("home.spa.cta")}</Link>
            </Button>
            <Button asChild variant="ghostLight" size="pillMd">
              <Link to={l("/tarifs#spa")}>{t("home.spa.allPrices")}</Link>
            </Button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export function Home() {
  const { t } = useTranslation();
  const lang = useLang();
  const l = useLocalePath();
  const tr = useTr();
  const text = usePageText("accueil");
  const { data } = useSiteData();
  const hero = usePhoto("accueil.hero");
  const extraGallery = useExtraPhotos("accueil");
  usePageMeta();

  const highlights = t("home.highlights") as unknown as { title: string; text: string }[];
  const facts = t("home.facts", { returnObjects: true }) as unknown as string[];
  const teasers = t("home.teasers") as unknown as { title: string; text: string }[];
  const [street, city] = data.settings.address.split(/,\s*/);

  return (
    <>
      {data.banner && <EventBannerView event={data.banner} lang={lang} />}

      {/* On desktop the hero, the booking bar and the arrow fill the first screen, the arrow sitting at its bottom. */}
      <div className="flex flex-col lg:min-h-[calc(100svh-81px)]">
        <section className="relative flex min-h-[620px] items-end overflow-hidden bg-ink lg:min-h-[clamp(420px,calc(100svh-340px),620px)] lg:flex-1">
          {hero?.url && (
            <img
              src={hero.url}
              alt={tr(hero.alt)}
              fetchPriority="high"
              className="photo-warm hero-zoom absolute inset-0 h-full w-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(35,24,14,0.62)_0%,rgba(35,24,14,0.28)_55%,rgba(35,24,14,0)_80%),linear-gradient(180deg,rgba(43,42,37,0)_0%,rgba(35,24,14,0.40)_100%)]" />
          <div className="px-gutter relative z-[2] max-w-[900px] pb-[72px] pt-[clamp(48px,8vw,96px)] text-cream animate-in fade-in-0 slide-in-from-bottom-4 duration-1000 lg:max-w-[1000px] lg:pb-[clamp(64px,8vh,84px)] lg:pt-[clamp(16px,2.4vh,72px)]">
            <span className="text-[13px] uppercase tracking-[2px] text-wheat-light">{text("heroEyebrow")}</span>
            <Accent size="lg" className="mt-[18px] lg:mt-[min(18px,1.6vh)]" />
            <h1 className="mb-6 mt-[18px] font-serif text-[clamp(36px,5.5vw,64px)] font-medium leading-[1.08] lg:mb-[min(24px,2.2vh)] lg:mt-[min(18px,1.6vh)] lg:text-[clamp(36px,min(4.6vw,5.4vh),64px)]">
              <Typo text={text("heroTitle")} />
            </h1>
            <p className="mb-6 max-w-[640px] text-lg leading-relaxed text-[#F6EEDC] lg:mb-[min(24px,2.2vh)] lg:text-[clamp(16px,2.2vh,18px)]">
              {text("heroSubtitle")}
            </p>
            <ul className="mb-8 flex flex-wrap gap-2 lg:mb-[min(32px,2.6vh)]" aria-label={t("home.factsLabel")}>
              {facts.map((f) => (
                <li key={f} className="rounded-full border border-cream/30 bg-ink/25 px-3.5 py-1.5 text-[13px] text-cream backdrop-blur-sm">
                  {f}
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-4">
              <Button asChild variant="clay" size="pillLg">
                <Link to={l("/tarifs#disponibilites")}>{t("home.ctaAvailability")}</Link>
              </Button>
              <Button asChild variant="ghostLight" size="pillLg">
                <Link to={l("/le-gite")}>{t("home.ctaDiscover")}</Link>
              </Button>
            </div>
          </div>
        </section>
        <SageStripe />

        <BookingBar />
        <ScrollHint targetId="bienvenue" />
      </div>

      <section id="bienvenue" className="px-gutter scroll-mt-20 pb-[72px] pt-20 lg:pt-16">
        <Reveal className="mx-auto flex max-w-[1100px] flex-wrap gap-16">
          <div className="flex-[1_1_320px]">
            <Eyebrow>{t("home.welcome")}</Eyebrow>
            <h2 className="mt-3.5 font-serif text-[clamp(28px,3.5vw,40px)] font-medium leading-[1.15]">{text("welcomeTitle")}</h2>
          </div>
          <div className="flex-[1_1_420px] space-y-5 text-base leading-[1.75] text-ink-soft">
            <p>{text("welcomeP1")}</p>
            <p>{text("welcomeP2")}</p>
          </div>
        </Reveal>
        <Reveal className="mx-auto mt-12 grid max-w-[1100px] grid-cols-1 gap-5 sm:h-[clamp(300px,34vw,420px)] sm:grid-cols-[2fr_3fr]">
          <SitePhoto slot="accueil.porche" zoomable className="aspect-[4/3] w-full rounded-[14px] sm:aspect-auto sm:h-full" />
          <SitePhoto slot="accueil.aerienne" zoomable className="aspect-[4/3] w-full rounded-[14px] sm:aspect-auto sm:h-full" />
        </Reveal>
      </section>

      <section className="px-gutter bg-sand pb-24 pt-12">
        <div className="mx-auto max-w-[1200px]">
          <Reveal>
            <SectionTitle className="mb-3.5 text-center">{t("home.essentials")}</SectionTitle>
            <Accent className="mb-[26px] justify-center" />
          </Reveal>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(220px,100%),1fr))] gap-9">
            {highlights.map((h, i) => (
              <Reveal key={h.title} delay={(i % 3) * 90} className="flex flex-col gap-2.5">
                <svg
                  width="30"
                  height="30"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-sage"
                  aria-hidden="true"
                >
                  {highlightIcons[i]}
                </svg>
                <h3 className="text-base font-semibold">{h.title}</h3>
                <p className="text-sm leading-relaxed text-umber">{h.text}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <SpaFeature />

      <section className="px-gutter py-20">
        <Reveal className="mx-auto flex max-w-[1100px] flex-wrap-reverse items-center gap-14">
          <SitePhoto
            slot="accueil.portrait"
            className="aspect-square max-w-[320px] flex-[1_1_280px] rounded-[14px] border border-khaki"
            fallback={
              <PortraitIllustration
                label={t("home.ownersIllustration")}
                className="aspect-square max-w-[320px] flex-[1_1_280px] rounded-[14px] border border-khaki"
              />
            }
          />
          <div className="flex-[1_1_380px]">
            <Eyebrow>{t("home.ownersEyebrow")}</Eyebrow>
            <h2 className="mb-4 mt-3.5 font-serif text-[clamp(26px,3.2vw,34px)] font-medium leading-tight">{text("ownersTitle")}</h2>
            <p className="text-base leading-[1.75] text-ink-soft">{text("ownersText")}</p>
          </div>
        </Reveal>
      </section>

      <section className="px-gutter py-24">
        <div className="mx-auto max-w-[1200px]">
          <Reveal className="mb-10 flex flex-wrap items-baseline justify-between gap-4">
            <SectionTitle>{t("home.gallery")}</SectionTitle>
            <Link to={l("/le-gite")} className="text-[13px] font-semibold uppercase tracking-[1px] text-clay">
              {t("home.galleryAll")}
            </Link>
          </Reveal>
          <Reveal>
            <PhotoGrid
              slots={gallerySlots}
              extras={extraGallery}
              className="grid grid-cols-[repeat(auto-fit,minmax(min(240px,100%),1fr))] gap-5"
              tileClassName="aspect-[4/3] rounded-[14px]"
            />
          </Reveal>
        </div>
      </section>

      <HomeReviews />

      <section className="px-gutter py-24">
        <div className="mx-auto max-w-[1200px]">
          <Reveal>
            <SectionTitle className="mb-3 text-center">{t("home.regionTitle")}</SectionTitle>
            <p className="mx-auto mb-10 max-w-[620px] text-center text-umber">{t("home.regionText")}</p>
          </Reveal>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(260px,100%),1fr))] gap-6">
            {teasers.map((r, i) => (
              <Reveal
                key={r.title}
                delay={i * 90}
                className="lift overflow-hidden rounded-2xl bg-sand shadow-[0_2px_10px_rgba(43,42,37,0.06)]"
              >
                <SitePhoto slot={teaserSlots[i]} zoomable className="aspect-[16/10] w-full border-0" />
                <div className="p-5">
                  <h3 className="mb-1.5 text-base font-semibold">{r.title}</h3>
                  <p className="text-sm text-umber">{r.text}</p>
                  {officialSites[teaserSlots[i]] && (
                    <a
                      href={officialSites[teaserSlots[i]]}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-flex items-center gap-1 text-[12px] font-semibold uppercase tracking-[1px] text-clay hover:text-rust"
                    >
                      {t("region.officialSite")} <ArrowUpRight className="size-3.5" aria-hidden="true" />
                    </a>
                  )}
                </div>
              </Reveal>
            ))}
          </div>
          <div className="mt-9 text-center">
            <Link to={l("/region")} className="text-[13px] font-semibold uppercase tracking-[1px] text-clay">
              {t("home.exploreRegion")}
            </Link>
          </div>
        </div>
      </section>

      <section className="flex flex-wrap">
        <ManorMap className="h-[260px] flex-[1_1_420px] md:h-[320px]" />
        <div className="px-gutter flex flex-[1_1_420px] flex-col justify-center gap-3 bg-sand py-10">
          <h2 className="font-serif text-[26px] font-medium">{t("home.findUs")}</h2>
          <p className="text-[15px] leading-[1.7] text-ink-soft">
            {street}
            <br />
            {city}, Manche
            <br />
            {t("home.nearSea")}
          </p>
          <Link to={l("/contact#acces")} className="text-[13px] font-semibold uppercase tracking-[1px] text-clay">
            {t("home.directionsContact")}
          </Link>
        </div>
      </section>
    </>
  );
}
