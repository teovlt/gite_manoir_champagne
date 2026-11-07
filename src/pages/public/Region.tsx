import { useTranslation } from "react-i18next";
import { PageHero } from "@/components/site/page-hero";
import { Accent, SectionTitle } from "@/components/site/ornaments";
import { PhotoGrid, SitePhoto } from "@/components/site/site-photo";
import { Reveal } from "@/components/site/reveal";
import { useExtraPhotos, usePageText, usePhoto } from "@/providers/site-data-provider";
import { usePageMeta } from "@/lib/use-page-meta";
import { Typo } from "@/lib/format";
import { useTr } from "@/lib/locale";

const sightSlots = ["region.barneville", "region.hague", "region.cherbourg", "region.barfleur", "region.gatteville", "region.racine", "region.vauban", "region.saint-vaast"];
type Item = { title: string; text: string };

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
  return (
    <div className="group relative flex min-h-[300px] flex-[1_1_420px] items-center justify-center overflow-hidden text-cream">
      {photo?.url ? (
        <img src={photo.url} alt={tr(photo.alt)} loading="lazy" className="photo-warm absolute inset-0 h-full w-full object-cover transition-transform duration-1000 group-hover:scale-105" />
      ) : (
        illustration
      )}
      <div className="absolute inset-0" style={{ background: overlay }} />
      {!photo?.url && (
        <span className="absolute right-[18px] top-[18px] z-[2] rounded-[14px] bg-ink/45 px-2.5 py-[5px] text-[11px] uppercase tracking-[1px]">
          {t("region.illustration")} — {item.title}
        </span>
      )}
      <Reveal className="relative z-[2] p-8 text-center">
        <h3 className="font-serif text-[22px] font-medium">{item.title}</h3>
        <p className="mt-2.5 text-sm text-[#F6EEDC]">{item.text}</p>
      </Reveal>
    </div>
  );
}

export function Region() {
  const { t } = useTranslation();
  const text = usePageText("region");
  const extras = useExtraPhotos("region");
  usePageMeta({ title: t("navbar.region"), description: text("heroSubtitle") });

  const sights = t("region.sights") as unknown as Item[];
  const memory = t("region.memoryList") as unknown as Item[];
  const activities = t("region.activityList") as unknown as Item[];

  return (
    <>
      <PageHero eyebrow={t("region.eyebrow")} title={text("heroTitle")} subtitle={text("heroSubtitle")} photoSlot="region.hero" placeholderLabel={t("region.heroPhoto")} />

      <section className="px-gutter pb-12 pt-20">
        <div className="mx-auto max-w-[1200px]">
          <Reveal>
            <SectionTitle className="mb-3">{t("region.see")}</SectionTitle>
            <Accent className="mb-5" />
            <p className="mb-10 max-w-[640px] text-umber">{text("intro")}</p>
          </Reveal>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(260px,100%),1fr))] gap-6">
            {sights.map((s, i) => (
              <Reveal key={s.title} delay={(i % 4) * 70} className="lift overflow-hidden rounded-2xl bg-sand shadow-[0_2px_10px_rgba(43,42,37,0.06)]">
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
              <PhotoGrid extras={extras} className="grid grid-cols-[repeat(auto-fit,minmax(min(260px,100%),1fr))] gap-6" tileClassName="aspect-[16/10] rounded-2xl" />
            </Reveal>
          )}
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
        <FeatureTile slot="region.mont" item={t("region.mont") as unknown as Item} overlay="rgba(126,149,116,0.4)" illustration={<MontIllustration />} />
        <FeatureTile slot="region.saint-malo" item={t("region.malo") as unknown as Item} overlay="rgba(94,120,83,0.4)" illustration={<MaloIllustration />} />
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
            {activities.map((a, i) => (
              <Reveal key={a.title} delay={(i % 3) * 70} className="lift rounded-[14px] bg-cream p-5">
                <h3 className="mb-1.5 text-sm font-semibold">{a.title}</h3>
                <p className="text-[13px] text-umber">{a.text}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
