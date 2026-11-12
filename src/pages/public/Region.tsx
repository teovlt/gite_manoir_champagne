import { useState } from "react";
import { ArrowUpRight, Bike, MapPinned, Footprints, Gauge, PawPrint, Sailboat, Trees } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { PageHero } from "@/components/site/page-hero";
import { Accent, SectionTitle } from "@/components/site/ornaments";
import { PhotoGrid, SitePhoto } from "@/components/site/site-photo";
import { Reveal } from "@/components/site/reveal";
import { useExtraPhotos, usePageText, usePhoto } from "@/providers/site-data-provider";
import { usePageMeta } from "@/lib/use-page-meta";
import { Typo } from "@/lib/format";
import { useTr } from "@/lib/locale";
import { officialSites } from "@/lib/region-links";
import { PhotoCredit } from "@/components/site/photo-credit";

const sightSlots = [
  "region.barneville",
  "region.hague",
  "region.cherbourg",
  "region.barfleur",
  "region.gatteville",
  "region.racine",
  "region.vauban",
  "region.saint-vaast",
];
type Item = { title: string; text: string };

/** The owners' Google My Maps "Lieux de visite", from their former site. */
const visitMapId = "1b7Vrl9IzvFYCGiSvjMtvUf8NYKWH5zU";

/** Loads Google's iframe only on click, so visitors aren't tracked by just opening the page. */
function VisitMap() {
  const { t } = useTranslation();
  const [shown, setShown] = useState(false);
  const viewer = `https://www.google.com/maps/d/viewer?mid=${visitMapId}`;
  return (
    <div>
      <div className="relative h-[clamp(320px,60vh,520px)] overflow-hidden rounded-[18px] border border-line bg-moss-light">
        {shown ? (
          <iframe
            src={`https://www.google.com/maps/d/embed?mid=${visitMapId}&ehbc=2E312F`}
            title={t("region.mapTitle")}
            className="absolute inset-0 h-full w-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
            <span
              className="flex size-14 items-center justify-center rounded-full bg-cream text-moss shadow-[0_6px_16px_rgba(43,42,37,0.12)]"
              aria-hidden="true"
            >
              <MapPinned className="size-7" strokeWidth={1.6} />
            </span>
            <Button type="button" variant="clay" size="pillMd" onClick={() => setShown(true)}>
              {t("region.mapLoad")}
            </Button>
            <p className="max-w-[420px] text-[13px] text-umber">{t("region.mapNotice")}</p>
          </div>
        )}
      </div>
      <a
        href={viewer}
        target="_blank"
        rel="noreferrer"
        className="mt-3 inline-flex items-center gap-1 text-[12px] font-semibold uppercase tracking-[1px] text-clay hover:text-rust"
      >
        {t("region.mapOpen")} <ArrowUpRight className="size-3.5" aria-hidden="true" />
      </a>
    </div>
  );
}

/** Same order as region.activityList in the locales: sailing, hiking, cycling, karting, nature park, zoo. */
const activityIcons = [Sailboat, Footprints, Bike, Gauge, Trees, PawPrint];

const MontIllustration = () => (
  <svg viewBox="0 0 420 300" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 block h-full w-full" aria-hidden="true">
    <rect width="420" height="300" fill="#A8B89C" />
    <rect y="190" width="420" height="110" fill="#8FA885" />
    <path d="M150 195 L185 120 L200 150 L215 95 L235 140 L260 195 Z" fill="#6E8864" />
    <rect x="193" y="75" width="8" height="22" fill="#6E8864" />
    <path d="M189 78 L197 58 L205 78 Z" fill="#6E8864" />
    <circle cx="197" cy="54" r="2.5" fill="#6E8864" />
    <path d="M0 230 Q60 215 120 230 T240 230 T360 230 T420 225 L420 300 L0 300 Z" fill="#7E9574" opacity="0.5" />
  </svg>
);

const MaloIllustration = () => (
  <svg viewBox="0 0 420 300" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 block h-full w-full" aria-hidden="true">
    <rect width="420" height="300" fill="#7E9574" />
    <rect y="190" width="420" height="110" fill="#6E8864" />
    <rect x="60" y="150" width="300" height="55" fill="#5C7853" />
    {[60, 96, 132, 168, 204, 240, 276, 312, 342].map((x) => (
      <rect key={x} x={x} y="138" width="18" height="14" fill="#5C7853" />
    ))}
    <rect x="320" y="90" width="10" height="60" fill="#5C7853" />
    <path d="M318 90 L325 72 L332 90 Z" fill="#5C7853" />
    <circle cx="325" cy="80" r="3" fill="#F3DDB8" opacity="0.85" />
  </svg>
);

function FeatureTile({ slot, item, overlay, illustration }: { slot: string; item: Item; overlay: string; illustration: React.ReactNode }) {
  const { t } = useTranslation();
  const tr = useTr();
  const photo = usePhoto(slot);
  const href = officialSites[slot];
  const Tag = href ? "a" : "div";
  return (
    // The credit is a link of its own, so it sits next to the tile's link rather than inside it.
    <div className="relative flex flex-[1_1_420px]">
      <Tag
        {...(href ? { href, target: "_blank", rel: "noreferrer", "aria-label": `${item.title} — ${t("region.officialSite")}` } : {})}
        className="group relative flex min-h-[340px] w-full items-center justify-center overflow-hidden text-cream hover:text-cream focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-wheat-light"
      >
        {photo?.url ? (
          <img
            src={photo.url}
            alt={tr(photo.alt)}
            loading="lazy"
            className="photo-warm absolute inset-0 h-full w-full object-cover transition-transform duration-1000 group-hover:scale-105"
          />
        ) : (
          illustration
        )}
        <div className="absolute inset-0 transition-opacity duration-500 group-hover:opacity-80" style={{ background: overlay }} />
        {!photo?.url && (
          <span className="absolute right-[18px] top-[18px] z-[2] rounded-[14px] bg-ink/45 px-2.5 py-[5px] text-[11px] uppercase tracking-[1px]">
            {t("region.illustration")} — {item.title}
          </span>
        )}
        <Reveal className="relative z-[2] p-8 text-center [text-shadow:0_1px_12px_rgba(35,24,14,0.55)]">
          <h3 className="font-serif text-[26px] font-medium">{item.title}</h3>
          <p className="mt-2.5 text-sm text-[#F6EEDC]">{item.text}</p>
          {href && (
            <span className="mt-5 inline-flex items-center gap-1.5 rounded-full border border-cream/60 bg-ink/25 px-4 py-2 text-[12px] font-semibold uppercase tracking-[1px] backdrop-blur-sm transition-colors [text-shadow:none] group-hover:bg-cream group-hover:text-ink">
              {t("region.officialSite")} <ArrowUpRight className="size-3.5" aria-hidden="true" />
            </span>
          )}
        </Reveal>
      </Tag>
      <PhotoCredit url={photo?.url} />
    </div>
  );
}

export function Region() {
  const { t } = useTranslation();
  const text = usePageText("region");
  const extras = useExtraPhotos("region");
  usePageMeta();

  const sights = t("region.sights") as unknown as Item[];
  const memory = t("region.memoryList") as unknown as Item[];
  const activities = t("region.activityList") as unknown as Item[];

  return (
    <>
      <PageHero
        eyebrow={t("region.eyebrow")}
        title={text("heroTitle")}
        subtitle={text("heroSubtitle")}
        photoSlot="region.hero"
        fallbackSlot="jardins.etang"
        sideSlots={["region.mont", "region.barfleur"]}
      />

      <section className="px-gutter pb-12 pt-20">
        <div className="mx-auto max-w-[1200px]">
          <Reveal>
            <SectionTitle className="mb-3">{t("region.see")}</SectionTitle>
            <Accent className="mb-5" />
            <p className="mb-10 max-w-[640px] text-umber">{text("intro")}</p>
          </Reveal>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(260px,100%),1fr))] gap-6">
            {sights.map((s, i) => (
              <Reveal
                key={s.title}
                delay={(i % 4) * 70}
                className="lift overflow-hidden rounded-2xl bg-sand shadow-[0_2px_10px_rgba(43,42,37,0.06)]"
              >
                <SitePhoto slot={sightSlots[i]} zoomable className="aspect-[16/10] w-full border-0" />
                <div className="p-[18px]">
                  <h3 className="mb-1.5 text-[15px] font-semibold">{s.title}</h3>
                  <p className="text-[13px] text-umber">
                    <Typo text={s.text} />
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
          {extras.length > 0 && (
            <Reveal className="mt-6">
              <PhotoGrid
                extras={extras}
                className="grid grid-cols-[repeat(auto-fit,minmax(min(260px,100%),1fr))] gap-6"
                tileClassName="aspect-[16/10] rounded-2xl"
              />
            </Reveal>
          )}
        </div>
      </section>

      <section id="carte" className="px-gutter scroll-mt-24 pb-16 pt-4">
        <div className="mx-auto max-w-[1200px]">
          <Reveal>
            <h2 className="mb-3 font-serif text-[26px] font-medium">{t("region.mapTitle")}</h2>
            <p className="mb-7 max-w-[640px] text-umber">{t("region.mapText")}</p>
          </Reveal>
          <VisitMap />
        </div>
      </section>

      <section className="px-gutter bg-sand py-16">
        <div className="mx-auto max-w-[1200px]">
          <h2 className="mb-8 font-serif text-[26px] font-medium">{t("region.memory")}</h2>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(260px,100%),1fr))] gap-6">
            {memory.map((m, i) => (
              <Reveal key={m.title} delay={i * 70} className="lift rounded-[14px] bg-cream p-[22px]">
                <h3 className="mb-2 text-[15px] font-semibold">{m.title}</h3>
                <p className="text-[13px] leading-relaxed text-umber">
                  <Typo text={m.text} />
                </p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="flex flex-wrap">
        <FeatureTile
          slot="region.mont"
          item={t("region.mont") as unknown as Item}
          overlay="rgba(126,149,116,0.4)"
          illustration={<MontIllustration />}
        />
        <FeatureTile
          slot="region.saint-malo"
          item={t("region.malo") as unknown as Item}
          overlay="rgba(94,120,83,0.4)"
          illustration={<MaloIllustration />}
        />
      </section>

      <section className="px-gutter py-16">
        <Reveal className="mx-auto max-w-[1100px]">
          <h2 className="mb-3 font-serif text-2xl font-medium">{t("region.islands")}</h2>
          <p className="max-w-[720px] text-[15px] leading-[1.75] text-ink-soft">{text("islands")}</p>
        </Reveal>
      </section>

      <section className="px-gutter bg-sand pb-24 pt-12">
        <div className="mx-auto max-w-[1200px]">
          <h2 className="mb-8 font-serif text-[26px] font-medium">{t("region.activities")}</h2>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(260px,100%),1fr))] gap-5">
            {activities.map((a, i) => {
              const Icon = activityIcons[i] ?? Trees;
              return (
                <Reveal key={a.title} delay={(i % 3) * 70} className="lift flex gap-4 rounded-[14px] bg-cream p-5">
                  <span
                    className="flex size-11 shrink-0 items-center justify-center rounded-full bg-moss-light text-moss"
                    aria-hidden="true"
                  >
                    <Icon className="size-[22px]" strokeWidth={1.6} />
                  </span>
                  <div>
                    <h3 className="mb-1.5 text-sm font-semibold">{a.title}</h3>
                    <p className="text-[13px] text-umber">{a.text}</p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}
