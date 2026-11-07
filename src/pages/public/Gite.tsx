import { PageHero } from "@/components/site/page-hero";
import { Accent, SectionTitle } from "@/components/site/ornaments";
import { SitePhoto } from "@/components/site/site-photo";
import { useExtraPhotos, usePageText } from "@/providers/site-data-provider";
import { lines } from "@/lib/format";

const rooms = [
  { slot: "gite.serenite", name: "Chambre Sérénité", tag: "Rez-de-chaussée · accès PMR", text: "1 lit 160×200. Salle d'eau avec douche hydromassante grand format à siège intégré, lavabo, WC." },
  { slot: "gite.bateau", name: "Chambre Bateau", tag: "Étage · thème marin", text: "2 lits 90×190, 1 lit superposé 90×190, 1 lit tiroir 90×190. Salle de bain avec vasque en verre et douche hydromassante, WC." },
  { slot: "gite.familiale", name: "Chambre Familiale", tag: "Étage", text: "2 lits 90×190." },
  { slot: "gite.marquise", name: "Chambre La Marquise", tag: "Étage", text: "2 lits 90×200. Armoire de style normand. Salle de bain avec vasque en verre, douche hydromassante grand format, WC." },
];

const badges = ["Meublé ★★★", "Chèques-vacances acceptés", "Paiement CB"];

export function Gite() {
  const text = usePageText("gite");
  const extras = useExtraPhotos("gite");

  return (
    <>
      <PageHero eyebrow="Hébergement" title={text("heroTitle")} photoSlot="gite.hero" />

      <section className="px-gutter pb-12 pt-16">
        <div className="mx-auto flex max-w-[1100px] flex-wrap items-start gap-12">
          <p className="flex-[1_1_560px] text-base leading-[1.75] text-ink-soft">{text("intro")}</p>
          <div className="flex flex-wrap items-center gap-4">
            {badges.map((b) => (
              <span key={b} className="rounded-full border border-line-strong px-3.5 py-2 text-xs tracking-[0.5px] text-umber">
                {b}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="px-gutter bg-sand py-12">
        <div className="mx-auto max-w-[1100px]">
          <SectionTitle className="mb-10">Les espaces de vie</SectionTitle>

          <div className="mb-14 flex flex-wrap items-center gap-12">
            <SitePhoto slot="gite.salon" className="aspect-[4/3] flex-[1_1_420px] rounded-[14px]" />
            <div className="flex-[1_1_360px]">
              <h3 className="mb-3 font-serif text-[22px] font-medium">{text("salonTitle")}</h3>
              <p className="text-[15px] leading-[1.75] text-ink-soft">{text("salonText")}</p>
            </div>
          </div>

          <div className="flex flex-wrap-reverse items-center gap-12">
            <div className="flex-[1_1_360px]">
              <h3 className="mb-3 font-serif text-[22px] font-medium">{text("kitchenTitle")}</h3>
              <p className="mb-3.5 text-[15px] leading-[1.75] text-ink-soft">De quoi cuisiner pour un grand groupe sans rien oublier&nbsp;:</p>
              <ul className="grid grid-cols-[repeat(auto-fit,minmax(min(160px,100%),1fr))] gap-x-4 gap-y-2 text-sm text-ink-soft">
                {lines(text("kitchenList")).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <SitePhoto slot="gite.cuisine" className="aspect-[4/3] flex-[1_1_420px] rounded-[14px]" />
          </div>
        </div>
      </section>

      <section className="px-gutter py-24">
        <div className="mx-auto max-w-[1200px]">
          <SectionTitle className="mb-3">Les chambres</SectionTitle>
          <Accent className="mb-3" />
          <p className="mb-10 max-w-[640px] text-umber">{text("roomsIntro")}</p>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(300px,100%),1fr))] gap-7">
            {rooms.map((r) => (
              <article key={r.slot} className="overflow-hidden rounded-2xl bg-sand shadow-[0_2px_10px_rgba(43,42,37,0.06)]">
                <SitePhoto slot={r.slot} className="aspect-[4/3] border-0" />
                <div className="p-[22px]">
                  <h3 className="mb-2 font-serif text-lg font-medium">{r.name}</h3>
                  <p className="mb-2.5 text-[13px] uppercase tracking-[0.5px] text-clay">{r.tag}</p>
                  <p className="text-sm leading-relaxed text-umber">{r.text}</p>
                </div>
              </article>
            ))}
          </div>
          <p className="mt-7 text-[13px] text-stone">{text("roomsNote")}</p>
        </div>
      </section>

      {extras.length > 0 && (
        <section className="px-gutter pb-24">
          <div className="mx-auto max-w-[1200px]">
            <SectionTitle className="mb-10">Galerie</SectionTitle>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(240px,100%),1fr))] gap-5">
              {extras.map((p) => (
                <div key={p.id} className="aspect-[4/3] overflow-hidden rounded-[14px]">
                  <img src={p.url!} alt={p.alt} loading="lazy" className="photo-warm block h-full w-full object-cover" />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="bg-sand pb-24">
        <div className="px-gutter mx-auto max-w-[1200px] pt-[72px]">
          <SectionTitle className="mb-10">Plans du gîte</SectionTitle>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(360px,100%),1fr))] gap-7">
            <SitePhoto slot="gite.plan-rdc" contain className="aspect-[4/3] rounded-[14px]" />
            <SitePhoto slot="gite.plan-etage" contain className="aspect-[4/3] rounded-[14px]" />
          </div>
        </div>
      </section>
    </>
  );
}
