import { Button } from "@/components/ui/button";
import { PageHero } from "@/components/site/page-hero";
import { usePageText } from "@/providers/site-data-provider";

export function Avis() {
  const text = usePageText("avis");
  const reviews = [1, 2, 3, 4, 5, 6].map((i) => ({ text: text(`review${i}`), author: text(`author${i}`) })).filter((r) => r.text);
  const hasPlaceholders = reviews.some((r) => r.text.startsWith("["));

  return (
    <>
      <PageHero eyebrow="Livre d'or" title="Ce qu'en disent nos hôtes" minHeight={380} />

      <section className="px-gutter pb-4 pt-14">
        <p className="mx-auto max-w-[800px] text-center text-[15px] leading-[1.75] text-ink-soft">{text("intro")}</p>
      </section>

      <section className="px-gutter pb-20 pt-10">
        <div className="mx-auto grid max-w-[1200px] grid-cols-[repeat(auto-fit,minmax(min(280px,100%),1fr))] gap-7">
          {reviews.map((r, i) => (
            <figure key={i} className="flex flex-col gap-3.5 rounded-[14px] bg-sand p-7">
              <span className="text-[13px] tracking-[1px] text-clay" aria-label="5 étoiles sur 5">
                ★★★★★
              </span>
              <blockquote className="font-serif text-base italic leading-normal text-ink">« {r.text} »</blockquote>
              <figcaption className="text-[13px] text-stone">— {r.author}</figcaption>
            </figure>
          ))}
        </div>
        {hasPlaceholders && (
          <p className="mt-6 text-center text-[13px] text-stone">
            Ces emplacements sont prévus pour recueillir vos avis réels — à remplacer avant mise en ligne.
          </p>
        )}
      </section>

      <section className="px-gutter bg-sand py-16 text-center">
        <Button asChild variant="clay" size="pillLg">
          <a href={text("abritelUrl") || "#"} target="_blank" rel="noreferrer">
            Lire tous les avis sur Abritel ↗
          </a>
        </Button>
      </section>
    </>
  );
}
