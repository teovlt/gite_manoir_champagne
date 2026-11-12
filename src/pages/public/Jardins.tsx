import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Bike, Fence } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHero } from "@/components/site/page-hero";
import { Accent, Eyebrow } from "@/components/site/ornaments";
import { PhotoGrid, SitePhoto } from "@/components/site/site-photo";
import { Reveal } from "@/components/site/reveal";
import { useExtraPhotos, usePageText, useSiteData } from "@/providers/site-data-provider";
import { usePageMeta } from "@/lib/use-page-meta";
import { Typo, formatPrice } from "@/lib/format";
import { useLang, useLocalePath } from "@/lib/locale";

const north = ["jardins.nord-1", "jardins.nord-2", "jardins.porche", "jardins.nord-3"];
const games = ["jardins.jeux-toboggan", "jardins.jeux-trampoline", "jardins.jeux-ping-pong"];
const south = [
  "jardins.sud",
  "jardins.etang",
  "jardins.terrasse",
  "jardins.barbecue",
  "jardins.etang-2",
  "jardins.glycine",
  "jardins.pavillon-spa",
];

export function Jardins() {
  const { t } = useTranslation();
  const l = useLocalePath();
  const text = usePageText("jardins");
  const extras = useExtraPhotos("jardins");
  const lang = useLang();
  const horse = useSiteData().data.pricing.extras.find((x) => x.id === "cheval");
  usePageMeta();

  return (
    <>
      <PageHero
        eyebrow={t("jardins.eyebrow")}
        title={text("heroTitle")}
        subtitle={text("heroSubtitle")}
        photoSlot="jardins.hero"
        sideSlots={["jardins.hero-2", "jardins.hero-3"]}
      />

      <section className="px-gutter pb-12 pt-16">
        <div className="mx-auto max-w-[1200px]">
          <Reveal>
            <h2 className="mb-3.5 font-serif text-[26px] font-medium">{text("northTitle")}</h2>
            <p className="mb-8 max-w-[720px] text-[15px] leading-[1.75] text-ink-soft">
              <Typo text={text("northText")} />
            </p>
          </Reveal>
          <Reveal>
            <PhotoGrid
              slots={north}
              className="grid grid-cols-[repeat(auto-fit,minmax(min(220px,100%),1fr))] gap-[18px]"
              tileClassName="aspect-[4/3] rounded-[14px]"
            />
          </Reveal>
        </div>
      </section>

      <section className="px-gutter bg-sand py-16">
        <div className="mx-auto max-w-[1200px]">
          <Reveal>
            <h2 className="mb-3 font-serif text-[26px] font-medium">{text("southTitle")}</h2>
            <Accent className="mb-3.5" />
            <p className="mb-8 max-w-[720px] text-[15px] leading-[1.75] text-ink-soft">{text("southText")}</p>
          </Reveal>
          <Reveal>
            <PhotoGrid
              slots={south}
              extras={extras}
              className="grid grid-cols-[repeat(auto-fit,minmax(min(260px,100%),1fr))] gap-5"
              tileClassName="aspect-[4/3] rounded-[14px]"
            />
          </Reveal>
        </div>
      </section>

      <section className="px-gutter pt-16">
        <div className="mx-auto max-w-[1200px]">
          <Reveal>
            <h2 className="mb-3.5 font-serif text-[26px] font-medium">{t("jardins.gamesTitle")}</h2>
            <p className="mb-8 max-w-[720px] text-[15px] leading-[1.75] text-ink-soft">{t("jardins.gamesText")}</p>
          </Reveal>
          <Reveal>
            <PhotoGrid
              slots={games}
              className="grid grid-cols-[repeat(auto-fit,minmax(min(260px,100%),1fr))] gap-5"
              tileClassName="aspect-[4/3] rounded-[14px]"
            />
          </Reveal>
        </div>
      </section>

      <section className="px-gutter py-24">
        <Reveal className="mx-auto flex max-w-[1100px] flex-wrap items-center gap-12">
          <SitePhoto slot="jardins.spa" zoomable className="aspect-[4/3] flex-[1_1_420px] rounded-[14px]" />
          <div className="flex-[1_1_360px]">
            <Eyebrow>{t("jardins.option")}</Eyebrow>
            <h2 className="my-3.5 font-serif text-[26px] font-medium">{text("spaTitle")}</h2>
            <p className="mb-6 text-[15px] leading-[1.75] text-ink-soft">{text("spaText")}</p>
            <Button asChild variant="clay" size="pillMd">
              <Link to={l("/tarifs#spa")}>{t("jardins.spaPrices")}</Link>
            </Button>
          </div>
        </Reveal>
      </section>

      <section className="px-gutter bg-sand py-16">
        <div className="mx-auto max-w-[1100px]">
          <Reveal>
            <h2 className="mb-8 font-serif text-[26px] font-medium">{t("jardins.welcomeTitle")}</h2>
          </Reveal>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(300px,100%),1fr))] gap-6">
            {[
              { Icon: Bike, title: t("jardins.bikersTitle"), text: t("jardins.bikersText") },
              {
                Icon: Fence,
                title: t("jardins.ridersTitle"),
                text: t("jardins.ridersText", { price: formatPrice(horse?.price ?? 15, lang) }),
              },
            ].map(({ Icon, title, text }, i) => (
              <Reveal key={title} delay={i * 90} className="flex gap-4 rounded-[14px] bg-cream p-6">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-moss-light text-moss" aria-hidden="true">
                  <Icon className="size-[22px]" strokeWidth={1.6} />
                </span>
                <div>
                  <h3 className="mb-1.5 text-base font-semibold">{title}</h3>
                  <p className="text-sm leading-relaxed text-umber">{text}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <div className="mt-8">
            <Button asChild variant="clay" size="pillMd">
              <Link to={l("/contact")}>{t("jardins.askOwners")}</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
