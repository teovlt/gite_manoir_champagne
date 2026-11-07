import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { PageHero } from "@/components/site/page-hero";
import { Reveal } from "@/components/site/reveal";
import { usePageText, useSiteData } from "@/providers/site-data-provider";
import { usePageMeta } from "@/lib/use-page-meta";

export function Avis() {
  const { t } = useTranslation();
  const text = usePageText("avis");
  const { abritelUrl } = useSiteData().data.settings;
  usePageMeta({ title: t("avis.title"), description: text("intro") });

  const reviews = [1, 2, 3, 4, 5, 6].map((i) => ({ text: text(`review${i}`), author: text(`author${i}`) })).filter((r) => r.text);
  const hasPlaceholders = reviews.some((r) => r.text.startsWith("["));

  return (
    <>
      <PageHero eyebrow={t("avis.eyebrow")} title={t("avis.title")} minHeight={380} />

      <section className="px-gutter pb-4 pt-14">
        <Reveal as="div" className="mx-auto max-w-[800px] text-center text-[15px] leading-[1.75] text-ink-soft">
          <p>{text("intro")}</p>
        </Reveal>
      </section>

      <section className="px-gutter pb-20 pt-10">
        <div className="mx-auto grid max-w-[1200px] grid-cols-[repeat(auto-fit,minmax(min(280px,100%),1fr))] gap-7">
          {reviews.map((r, i) => (
            <Reveal as="figure" key={i} delay={(i % 3) * 90} className="lift flex flex-col gap-3.5 rounded-[14px] bg-sand p-7">
              <span className="text-[13px] tracking-[1px] text-clay" role="img" aria-label={t("avis.stars")}>
                ★★★★★
              </span>
              <blockquote className="font-serif text-base italic leading-normal text-ink">« {r.text} »</blockquote>
              <figcaption className="text-[13px] text-stone">— {r.author}</figcaption>
            </Reveal>
          ))}
        </div>
        {hasPlaceholders && <p className="mt-6 text-center text-[13px] text-stone">{t("avis.placeholders")}</p>}
      </section>

      {abritelUrl && (
        <section className="px-gutter bg-sand py-16 text-center">
          <Button asChild variant="clay" size="pillLg">
            <a href={abritelUrl} target="_blank" rel="noreferrer">
              {t("avis.all")}
            </a>
          </Button>
        </section>
      )}
    </>
  );
}
