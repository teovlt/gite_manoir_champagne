import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EventBannerView } from "@/components/site/event-banner";
import { Accent, Eyebrow, SageStripe, SectionTitle } from "@/components/site/ornaments";
import { SitePhoto } from "@/components/site/site-photo";
import { contactUrl, validateBooking } from "@/components/site/form-controls";
import { useExtraPhotos, usePageText, usePhoto, useSiteData } from "@/providers/site-data-provider";
import { Typo } from "@/lib/format";
import { cn } from "@/lib/utils";

const highlights = [
  {
    title: "5 chambres confortables",
    text: "4 chambres avec sanitaires privatifs, dont une de plain-pied accessible aux personnes à mobilité réduite.",
    icon: (
      <>
        <path d="M2 17h20" />
        <path d="M4 17v-5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v5" />
        <path d="M4 12h3a1 1 0 0 0 1-1v-1a1 1 0 0 0-1-1H5" />
        <path d="M2 21v-2M22 21v-2" />
      </>
    ),
  },
  {
    title: "Jacuzzi 7 places",
    text: "104 jets, en extérieur, disponible en option pour prolonger la détente sous les étoiles.",
    icon: (
      <>
        <path d="M3 17c1.5-1.5 3-1.5 4.5 0s3 1.5 4.5 0 3-1.5 4.5 0 3 1.5 4.5 0" />
        <path d="M3 21c1.5-1.5 3-1.5 4.5 0s3 1.5 4.5 0 3-1.5 4.5 0 3 1.5 4.5 0" />
        <circle cx="9" cy="7" r="1" />
        <circle cx="14" cy="5" r="1" />
        <circle cx="12" cy="10" r="1" />
      </>
    ),
  },
  {
    title: "Jardin clos de 1 500 m²",
    text: "Exposition plein sud, terrasse, transats, barbecue et portique pour les enfants.",
    icon: (
      <>
        <path d="M20 4c-9 0-16 7-16 16 9 0 16-7 16-16z" />
        <path d="M4 20c4-4 8-8 16-16" />
      </>
    ),
  },
  {
    title: "Étang de pêche privé",
    text: "Carpes, anguilles et gardons, à deux pas de la terrasse — canne en main, le temps s'arrête.",
    icon: (
      <>
        <path d="M2 14c4-6 14-6 18 0-4 6-14 6-18 0z" />
        <path d="M20 14l3-3v6l-3-3z" />
        <circle cx="7" cy="13" r="0.9" fill="currentColor" stroke="none" />
      </>
    ),
  },
  {
    title: "Cheminée & chauffage au sol",
    text: "Bois fourni pour les soirées fraîches, chauffage au sol au rez-de-chaussée.",
    icon: (
      <path d="M12 3c2 3-1 4-1 7 0 1.5 1 2 2 2 1.5 0 2.5-1.3 2-3 2.5 1.5 4 4 4 7a7 7 0 1 1-14 0c0-3 1.5-5 3-6.5-0.5 1.5 0 2.5 1 2.5 1.5 0 1-2 0-4.5C8 6 9.5 4 12 3z" />
    ),
  },
  {
    title: "Tout confort",
    text: "Wi-Fi gratuit, TV 107 cm, équipement bébé, volets électriques, aspiration centralisée.",
    icon: (
      <>
        <path d="M3 11l9-7 9 7" />
        <path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" />
      </>
    ),
  },
];

const gallerySlots = ["accueil.hero", "gite.salon", "gite.marquise", "jardins.sud", "jardins.etang", "jardins.porche"];

const regionTeasers = [
  { slot: "region.mont", title: "Mont-Saint-Michel", text: "Classé au patrimoine mondial de l'UNESCO." },
  { slot: "region.debarquement", title: "Plages du Débarquement", text: "Cimetière américain de Colleville, port artificiel d'Arromanches." },
  { slot: "region.barfleur", title: "Barfleur", text: "L'un des plus beaux villages de France, réputé pour ses moules." },
];

const bookingInputClass =
  "rounded-xl border border-line-strong bg-sand px-3.5 py-3 font-sans text-sm text-ink outline-none focus-visible:border-sage-dark focus-visible:ring-[3px] focus-visible:ring-sage/40";

function BookingBar() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [v, setV] = useState({ arrivee: "", depart: "", adultes: "", enfants: "" });
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => setV({ ...v, [k]: e.target.value });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const error = validateBooking(v);
    if (error) return toast.error(t(error));
    navigate(contactUrl(v));
  };

  const fields = [
    { id: "arrivee", label: t("booking.arrival"), type: "date", basis: "basis-[150px]" },
    { id: "depart", label: t("booking.departure"), type: "date", basis: "basis-[150px]", min: v.arrivee },
    { id: "adultes", label: t("booking.adults"), type: "number", basis: "basis-[110px]", min: "1", placeholder: "2" },
    { id: "enfants", label: t("booking.children"), type: "number", basis: "basis-[110px]", min: "0", placeholder: "0" },
  ] as const;

  return (
    <div className="px-gutter relative z-[3] mx-auto -mt-14 max-w-[1100px]">
      <form
        onSubmit={submit}
        className="flex flex-wrap items-end gap-5 rounded-[18px] bg-cream px-[clamp(20px,3vw,32px)] py-7 shadow-[0_14px_34px_rgba(43,42,37,0.2)]"
      >
        {fields.map((f) => (
          <div key={f.id} className={cn("flex flex-1 flex-col gap-1.5", f.basis)}>
            <label htmlFor={`b-${f.id}`} className="text-[11px] uppercase tracking-[0.5px] text-umber">
              {f.label}
            </label>
            <input
              id={`b-${f.id}`}
              type={f.type}
              min={"min" in f ? f.min : undefined}
              placeholder={"placeholder" in f ? f.placeholder : undefined}
              value={v[f.id]}
              onChange={set(f.id)}
              className={bookingInputClass}
            />
          </div>
        ))}
        <Button type="submit" variant="clay" size="pillMd" className="flex-none rounded-xl">
          {t("booking.check")}
        </Button>
      </form>
      <p className="mt-2.5 text-center text-xs text-stone">
        Vos dates et le nombre de voyageurs sont repris automatiquement sur la page Contact, ou{" "}
        <a href="/demande-reservation.pdf" download className="font-semibold text-clay">
          téléchargez directement le PDF de demande
        </a>
        .
      </p>
    </div>
  );
}

const PortraitIllustration = ({ className }: { className?: string }) => (
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
      Illustration — Loïc &amp; Maryline
    </span>
  </div>
);

export function Home() {
  const text = usePageText("accueil");
  const { data } = useSiteData();
  const hero = usePhoto("accueil.hero");
  const extraGallery = useExtraPhotos("accueil");

  return (
    <>
      {data.banner && <EventBannerView event={data.banner} />}

      <section className="relative flex min-h-[680px] items-end overflow-hidden bg-ink">
        {hero?.url && <img src={hero.url} alt={hero.alt} className="photo-warm absolute inset-0 h-full w-full object-cover" />}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(43,42,37,0)_0%,rgba(35,24,14,0.40)_100%)]" />
        <div className="px-gutter relative z-[2] max-w-[900px] pb-[72px] pt-[clamp(48px,8vw,96px)] text-cream">
          <span className="text-[13px] uppercase tracking-[2px] text-wheat-light">{text("heroEyebrow")}</span>
          <Accent size="lg" className="mt-[18px]" />
          <h1 className="mb-6 mt-[18px] font-serif text-[clamp(36px,5.5vw,64px)] font-medium leading-[1.08]">
            <Typo text={text("heroTitle")} />
          </h1>
          <p className="mb-8 max-w-[640px] text-lg leading-relaxed text-[#F6EEDC]">{text("heroSubtitle")}</p>
          <div className="flex flex-wrap gap-4">
            <Button asChild variant="clay" size="pillLg">
              <Link to="/tarifs">Vérifier les disponibilités</Link>
            </Button>
            <Button asChild variant="ghostLight" size="pillLg">
              <Link to="/le-gite">Découvrir le manoir</Link>
            </Button>
          </div>
        </div>
      </section>
      <SageStripe />

      <BookingBar />

      <section className="px-gutter pb-[72px] pt-24">
        <div className="mx-auto flex max-w-[1100px] flex-wrap gap-16">
          <div className="flex-[1_1_320px]">
            <Eyebrow>Bienvenue</Eyebrow>
            <h2 className="mt-3.5 font-serif text-[clamp(28px,3.5vw,40px)] font-medium leading-[1.15]">{text("welcomeTitle")}</h2>
          </div>
          <div className="flex-[1_1_420px] space-y-5 text-base leading-[1.75] text-ink-soft">
            <p>{text("welcomeP1")}</p>
            <p>{text("welcomeP2")}</p>
          </div>
        </div>
      </section>

      <section className="px-gutter py-20">
        <div className="mx-auto flex max-w-[1100px] flex-wrap-reverse items-center gap-14">
          <SitePhoto
            slot="accueil.portrait"
            className="aspect-square max-w-[320px] flex-[1_1_280px] rounded-[14px] border border-khaki"
            fallback={<PortraitIllustration className="aspect-square max-w-[320px] flex-[1_1_280px] rounded-[14px] border border-khaki" />}
          />
          <div className="flex-[1_1_380px]">
            <Eyebrow>Le mot des propriétaires</Eyebrow>
            <h2 className="mb-4 mt-3.5 font-serif text-[clamp(26px,3.2vw,34px)] font-medium leading-tight">{text("ownersTitle")}</h2>
            <p className="text-base leading-[1.75] text-ink-soft">{text("ownersText")}</p>
          </div>
        </div>
      </section>

      <section className="px-gutter bg-sand pb-24 pt-12">
        <div className="mx-auto max-w-[1200px]">
          <SectionTitle className="mb-3.5 text-center">L'essentiel du séjour</SectionTitle>
          <Accent className="mb-[26px] justify-center" />
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(220px,100%),1fr))] gap-9">
            {highlights.map((h) => (
              <div key={h.title} className="flex flex-col gap-2.5">
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
                  {h.icon}
                </svg>
                <h3 className="text-base font-semibold">{h.title}</h3>
                <p className="text-sm leading-relaxed text-umber">{h.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-gutter py-24">
        <div className="mx-auto max-w-[1200px]">
          <div className="mb-10 flex flex-wrap items-baseline justify-between gap-4">
            <SectionTitle>Un aperçu des lieux</SectionTitle>
            <Link to="/le-gite" className="text-[13px] font-semibold uppercase tracking-[1px] text-clay">
              Voir toute la galerie →
            </Link>
          </div>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(240px,100%),1fr))] gap-5">
            {gallerySlots.map((slot) => (
              <SitePhoto key={slot} slot={slot} className="aspect-[4/3] rounded-[14px]" />
            ))}
            {extraGallery.map((p) => (
              <div key={p.id} className="aspect-[4/3] overflow-hidden rounded-[14px]">
                <img src={p.url!} alt={p.alt} loading="lazy" className="photo-warm block h-full w-full object-cover" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-gutter bg-sand py-20">
        <div className="mx-auto max-w-[800px] text-center">
          <span className="font-serif text-5xl leading-none text-clay" aria-hidden="true">
            “
          </span>
          <p className="mb-7 mt-2 font-serif text-[22px] italic leading-normal">{text("quote")}</p>
          <Button asChild variant="clay" size="pillMd">
            <Link to="/avis">Lire les avis vérifiés</Link>
          </Button>
        </div>
      </section>

      <section className="px-gutter py-24">
        <div className="mx-auto max-w-[1200px]">
          <SectionTitle className="mb-3 text-center">À deux pas de la Manche historique</SectionTitle>
          <p className="mx-auto mb-10 max-w-[620px] text-center text-umber">
            Le Mont-Saint-Michel, les plages du Débarquement et les plus beaux villages du Cotentin sont à portée de voiture.
          </p>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(260px,100%),1fr))] gap-6">
            {regionTeasers.map((r) => (
              <div key={r.slot} className="overflow-hidden rounded-2xl bg-sand shadow-[0_2px_10px_rgba(43,42,37,0.06)]">
                <SitePhoto slot={r.slot} className="aspect-[16/10] border-0" />
                <div className="p-5">
                  <h3 className="mb-1.5 text-base font-semibold">{r.title}</h3>
                  <p className="text-sm text-umber">{r.text}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-9 text-center">
            <Link to="/region" className="text-[13px] font-semibold uppercase tracking-[1px] text-clay">
              Explorer la région →
            </Link>
          </div>
        </div>
      </section>

      <section className="flex flex-wrap">
        <a
          href="https://www.openstreetmap.org/search?query=2%20rue%20La%20Champagne%2C%2050190%20Milli%C3%A8res"
          target="_blank"
          rel="noreferrer"
          className="flex aspect-[4/3] flex-[1_1_420px] items-center justify-center bg-[#DCC9A0] p-4 text-center text-[13px] text-umber hover:text-ink"
        >
          Carte — 2 rue La Champagne, 50190 Millières
          <span className="sr-only"> (ouvrir dans OpenStreetMap)</span>
        </a>
        <div className="px-gutter flex flex-[1_1_420px] flex-col justify-center gap-4 bg-sand py-16">
          <h2 className="font-serif text-[26px] font-medium">Nous trouver</h2>
          <p className="text-[15px] leading-[1.7] text-ink-soft">
            2 rue La Champagne
            <br />
            50190 Millières, Manche
            <br />
            Normandie — à 10 minutes de la mer
          </p>
          <Link to="/contact" className="text-[13px] font-semibold uppercase tracking-[1px] text-clay">
            Itinéraire &amp; contact →
          </Link>
        </div>
      </section>
    </>
  );
}
