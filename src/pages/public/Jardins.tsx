import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PageHero } from "@/components/site/page-hero";
import { Accent, Eyebrow } from "@/components/site/ornaments";
import { SitePhoto } from "@/components/site/site-photo";
import { useExtraPhotos, usePageText } from "@/providers/site-data-provider";
import { Typo } from "@/lib/format";

const north = ["jardins.nord-1", "jardins.nord-2", "jardins.porche", "jardins.nord-3"];
const south = ["jardins.sud", "jardins.etang", "jardins.terrasse", "jardins.barbecue"];

export function Jardins() {
  const text = usePageText("jardins");
  const extras = useExtraPhotos("jardins");

  return (
    <>
      <PageHero eyebrow="Extérieurs" title={text("heroTitle")} subtitle={text("heroSubtitle")} photoSlot="jardins.hero" />

      <section className="px-gutter pb-12 pt-16">
        <div className="mx-auto max-w-[1200px]">
          <h2 className="mb-3.5 font-serif text-[26px] font-medium">{text("northTitle")}</h2>
          <p className="mb-8 max-w-[720px] text-[15px] leading-[1.75] text-ink-soft">
            <Typo text={text("northText")} />
          </p>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(220px,100%),1fr))] gap-[18px]">
            {north.map((slot) => (
              <SitePhoto key={slot} slot={slot} className="aspect-[4/3] rounded-[14px]" />
            ))}
          </div>
        </div>
      </section>

      <section className="px-gutter bg-sand py-16">
        <div className="mx-auto max-w-[1200px]">
          <h2 className="mb-3 font-serif text-[26px] font-medium">{text("southTitle")}</h2>
          <Accent className="mb-3.5" />
          <p className="mb-8 max-w-[720px] text-[15px] leading-[1.75] text-ink-soft">{text("southText")}</p>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(260px,100%),1fr))] gap-5">
            {south.map((slot) => (
              <SitePhoto key={slot} slot={slot} className="aspect-[4/3] rounded-[14px]" />
            ))}
            {extras.map((p) => (
              <div key={p.id} className="aspect-[4/3] overflow-hidden rounded-[14px]">
                <img src={p.url!} alt={p.alt} loading="lazy" className="photo-warm block h-full w-full object-cover" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-gutter py-24">
        <div className="mx-auto flex max-w-[1100px] flex-wrap items-center gap-12">
          <SitePhoto slot="jardins.spa" className="aspect-[4/3] flex-[1_1_420px] rounded-[14px]" />
          <div className="flex-[1_1_360px]">
            <Eyebrow>En option</Eyebrow>
            <h2 className="my-3.5 font-serif text-[26px] font-medium">{text("spaTitle")}</h2>
            <p className="mb-6 text-[15px] leading-[1.75] text-ink-soft">{text("spaText")}</p>
            <Button asChild variant="clay" size="pillMd">
              <Link to="/tarifs">Voir les tarifs du spa</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
