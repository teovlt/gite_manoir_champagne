import { useTranslation } from "react-i18next";
import { PageHero } from "@/components/site/page-hero";
import { Accent, SectionTitle } from "@/components/site/ornaments";
import { PhotoGrid, SitePhoto, useSlotImages } from "@/components/site/site-photo";
import { useLightbox } from "@/components/site/lightbox";
import { Reveal } from "@/components/site/reveal";
import { useExtraPhotos, usePageText } from "@/providers/site-data-provider";
import { usePageMeta } from "@/lib/use-page-meta";
import { lines } from "@/lib/format";

const salonSlots = ["gite.salon", "gite.salon-2", "gite.hero", "gite.salon-3", "gite.cheminee", "gite.salon-4", "gite.salon-soiree"];
const kitchenSlots = ["gite.cuisine", "gite.salle-a-manger", "gite.cuisine-2", "gite.cuisine-3", "gite.cuisine-4"];

/** Same order as gite.roomList in the locales. The Familiale and Cabine bedrooms share the suite's shower room. */
const suiteBath = ["gite.salle-d-eau", "gite.suite-sdb", "gite.verriere"];
const roomGalleries = [
  { photos: ["gite.serenite", "gite.serenite-2", "gite.serenite-3"], bath: ["gite.serenite-sdb", "gite.serenite-sdb-2"] },
  { photos: ["gite.bateau", "gite.bateau-2", "gite.bateau-3"], bath: ["gite.bateau-sdb", "gite.bateau-sdb-2", "gite.bateau-sdb-3"] },
  { photos: ["gite.familiale", "gite.hero-2", "gite.familiale-2", "gite.familiale-3", "gite.familiale-4"], bath: suiteBath },
  { photos: ["gite.cabine", "gite.cabine-2", "gite.cabine-3", "gite.cabine-4"], bath: suiteBath },
  {
    photos: ["gite.marquise", "gite.hero-3", "gite.marquise-3", "gite.marquise-4", "gite.marquise-5"],
    bath: ["gite.marquise-2", "gite.marquise-sdb", "gite.marquise-sdb-2"],
  },
];

/** A bedroom photo opening the room's gallery, with its bathroom shown as an inset. */
function RoomPhotos({ name, photos, bath }: { name: string; photos: string[]; bath: string[] }) {
  const { t } = useTranslation();
  const lightbox = useLightbox();
  const images = useSlotImages([...photos, ...bath]);
  const bathImages = useSlotImages(bath);
  const bathCover = bathImages[0];

  return (
    <div className="relative">
      <SitePhoto slot={photos[0]} zoomable gallery={[...photos, ...bath]} className="aspect-[4/3] w-full border-0" />
      {bathCover && (
        <button
          type="button"
          onClick={() =>
            lightbox.open(
              images,
              images.findIndex((img) => img.url === bathCover.url),
            )
          }
          className="zoom-frame absolute bottom-3 right-3 w-[34%] cursor-zoom-in overflow-hidden rounded-[10px] border-[3px] border-sand shadow-[0_8px_22px_rgba(43,42,37,0.35)]"
          aria-label={`${t("gite.bath")} — ${name}`}
        >
          <img
            src={bathCover.url}
            alt={bathCover.alt}
            loading="lazy"
            decoding="async"
            className="photo-warm block aspect-square w-full object-cover"
          />
          <span className="absolute inset-x-0 bottom-0 bg-ink/65 px-1.5 py-1 text-center text-[10px] font-semibold uppercase tracking-[0.8px] text-cream">
            {t("gite.bath")}
          </span>
        </button>
      )}
    </div>
  );
}
const gallerySlots = [
  "gite.salon-2",
  "gite.cheminee",
  "gite.salle-a-manger",
  "gite.bateau-2",
  "gite.marquise-2",
  "gite.salle-d-eau",
  "gite.verriere",
];

export function Gite() {
  const { t } = useTranslation();
  const text = usePageText("gite");
  const extras = useExtraPhotos("gite");
  usePageMeta();

  const rooms = t("gite.roomList") as unknown as { name: string; tag: string; text: string }[];
  const badges = t("gite.badges") as unknown as string[];

  return (
    <>
      <PageHero eyebrow={t("gite.eyebrow")} title={text("heroTitle")} photoSlot="gite.hero" sideSlots={["gite.hero-2", "gite.hero-3"]} />

      <section className="px-gutter pb-12 pt-16">
        <Reveal className="mx-auto flex max-w-[1100px] flex-wrap items-start gap-12">
          <p className="flex-[1_1_560px] text-base leading-[1.75] text-ink-soft">{text("intro")}</p>
          <div className="flex flex-wrap items-center gap-4">
            {badges.map((b) => (
              <span key={b} className="rounded-full border border-line-strong px-3.5 py-2 text-xs tracking-[0.5px] text-umber">
                {b}
              </span>
            ))}
          </div>
        </Reveal>
      </section>

      <section className="px-gutter bg-sand py-12">
        <div className="mx-auto max-w-[1100px]">
          <SectionTitle className="mb-10">{t("gite.living")}</SectionTitle>

          <Reveal className="mb-14 flex flex-wrap items-center gap-12">
            <SitePhoto slot="gite.salon" zoomable gallery={salonSlots} className="aspect-[4/3] flex-[1_1_420px] rounded-[14px]" />
            <div className="flex-[1_1_360px]">
              <h3 className="mb-3 font-serif text-[22px] font-medium">{text("salonTitle")}</h3>
              <p className="text-[15px] leading-[1.75] text-ink-soft">{text("salonText")}</p>
            </div>
          </Reveal>

          <Reveal className="flex flex-wrap-reverse items-center gap-12">
            <div className="flex-[1_1_360px]">
              <h3 className="mb-3 font-serif text-[22px] font-medium">{text("kitchenTitle")}</h3>
              <p className="mb-3.5 text-[15px] leading-[1.75] text-ink-soft">{t("gite.kitchenIntro")}</p>
              <ul className="grid grid-cols-[repeat(auto-fit,minmax(min(160px,100%),1fr))] gap-x-4 gap-y-2 text-sm text-ink-soft">
                {lines(text("kitchenList")).map((item) => (
                  <li key={item} className="flex gap-2 before:mt-[7px] before:size-1.5 before:shrink-0 before:rounded-full before:bg-sage">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <SitePhoto slot="gite.cuisine" zoomable gallery={kitchenSlots} className="aspect-[4/3] flex-[1_1_420px] rounded-[14px]" />
          </Reveal>
        </div>
      </section>

      <section className="px-gutter py-24">
        <div className="mx-auto max-w-[1200px]">
          <Reveal>
            <SectionTitle className="mb-3">{t("gite.rooms")}</SectionTitle>
            <Accent className="mb-3" />
            <p className="mb-10 max-w-[640px] text-umber">{text("roomsIntro")}</p>
          </Reveal>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(300px,100%),1fr))] gap-7">
            {rooms.map((r, i) => (
              <Reveal
                as="article"
                key={r.name}
                delay={(i % 2) * 100}
                className="lift overflow-hidden rounded-2xl bg-sand shadow-[0_2px_10px_rgba(43,42,37,0.06)]"
              >
                <RoomPhotos name={r.name} {...roomGalleries[i]} />
                <div className="p-[22px]">
                  <h3 className="mb-2 font-serif text-lg font-medium">{r.name}</h3>
                  <p className="mb-2.5 text-[13px] uppercase tracking-[0.5px] text-clay">{r.tag}</p>
                  <p className="text-sm leading-relaxed text-umber">{r.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <p className="mt-7 text-[13px] text-stone">{text("roomsNote")}</p>
        </div>
      </section>

      <section className="px-gutter pb-24">
        <div className="mx-auto max-w-[1200px]">
          <SectionTitle className="mb-10">{t("gite.gallery")}</SectionTitle>
          <Reveal>
            <PhotoGrid
              slots={gallerySlots}
              extras={extras}
              className="grid grid-cols-[repeat(auto-fit,minmax(min(240px,100%),1fr))] gap-5"
              tileClassName="aspect-[4/3] rounded-[14px]"
            />
          </Reveal>
        </div>
      </section>

      <section className="bg-sand pb-24">
        <div className="px-gutter mx-auto max-w-[1200px] pt-[72px]">
          <SectionTitle className="mb-10">{t("gite.plans")}</SectionTitle>
          <Reveal className="grid grid-cols-[repeat(auto-fit,minmax(min(360px,100%),1fr))] gap-7">
            <SitePhoto slot="gite.plan-rdc" contain zoomable className="aspect-[4/3] w-full rounded-[14px]" />
            <SitePhoto slot="gite.plan-etage" contain zoomable className="aspect-[4/3] w-full rounded-[14px]" />
          </Reveal>
        </div>
      </section>
    </>
  );
}
