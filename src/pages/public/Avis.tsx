import { useState } from "react";
import { useTranslation } from "react-i18next";
import googleReviews from "@shared/google-reviews.json";
import { Button } from "@/components/ui/button";
import { PageHero } from "@/components/site/page-hero";
import { Reveal } from "@/components/site/reveal";
import { usePageText, useSiteData } from "@/providers/site-data-provider";
import { intlLocale, useLang, useTr, type Translated } from "@/lib/locale";
import { usePageMeta } from "@/lib/use-page-meta";
import { cn } from "@/lib/utils";
import { GoogleG, Stars } from "@/components/site/reviews";

interface Review {
  author: string;
  rating: number;
  /** "YYYY-MM" or "YYYY" */
  visited?: string;
  text: string | Partial<Translated>;
  google?: boolean;
}

const LONG_REVIEW = 260;

function ReviewCard({ review, delay }: { review: Review; delay: number }) {
  const { t } = useTranslation();
  const lang = useLang();
  const tr = useTr();
  const [open, setOpen] = useState(false);
  const text = tr(review.text);
  const long = text.length > LONG_REVIEW;
  const translated = review.google && lang !== "fr";

  let visited = "";
  if (review.visited) {
    const [y, m] = review.visited.split("-").map(Number);
    visited = m
      ? t("avis.visited", { date: new Date(y, m - 1, 15).toLocaleDateString(intlLocale[lang], { month: "long", year: "numeric" }) })
      : t("avis.visitedYear", { date: y });
  }

  return (
    <Reveal
      as="figure"
      delay={delay}
      className="lift mb-7 flex break-inside-avoid flex-col gap-4 rounded-[18px] border border-line bg-cream p-7 shadow-[0_2px_10px_rgba(43,42,37,0.04)]"
    >
      <div className="flex items-center justify-between gap-3">
        <Stars value={review.rating} className="text-[15px]" />
        {review.google && <GoogleG className="size-[18px]" />}
      </div>
      <blockquote className="font-serif text-[16.5px] leading-[1.6] text-ink">
        <p className={cn(long && !open && "line-clamp-6")}>{text}</p>
      </blockquote>
      {long && (
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          className="self-start text-[12px] font-semibold uppercase tracking-[1px] text-clay hover:text-rust"
        >
          {open ? t("avis.readLess") : t("avis.readMore")}
        </button>
      )}
      <figcaption className="mt-auto flex items-center gap-3 border-t border-line pt-4">
        <span
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-sage/40 font-serif text-[17px] text-moss"
          aria-hidden="true"
        >
          {review.author.charAt(0)}
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="text-[14px] font-semibold text-ink">{review.author}</span>
          <span className="text-[12px] text-stone">
            {[visited, review.google && t("avis.fromGoogle"), translated && t("avis.translated")].filter(Boolean).join(" · ")}
          </span>
        </span>
      </figcaption>
    </Reveal>
  );
}

export function Avis() {
  const { t } = useTranslation();
  const lang = useLang();
  const text = usePageText("avis");
  const { abritelUrl } = useSiteData().data.settings;
  usePageMeta();

  // Owners can add extra reviews (e.g. from Abritel) in the admin, on top of the Google ones.
  const extra: Review[] = [1, 2, 3, 4, 5, 6]
    .map((i) => ({ text: text(`review${i}`), author: text(`author${i}`), rating: 5 }))
    .filter((r) => r.text && !r.text.startsWith("["));
  const reviews: Review[] = [...googleReviews.reviews.map((r) => ({ ...r, google: true })), ...extra];
  const rating = new Intl.NumberFormat(intlLocale[lang], { minimumFractionDigits: 1 }).format(googleReviews.rating);

  return (
    <>
      <PageHero eyebrow={t("avis.eyebrow")} title={t("avis.title")} photoSlot="jardins.terrasse" minHeight={400} />

      <section className="px-gutter pb-6 pt-14">
        <Reveal className="mx-auto flex max-w-[860px] flex-col items-center gap-9 text-center">
          <p className="text-[15px] leading-[1.75] text-ink-soft">{text("intro")}</p>

          <a
            href={googleReviews.url}
            target="_blank"
            rel="noreferrer"
            className="group flex flex-wrap items-center justify-center gap-x-6 gap-y-3 rounded-[20px] border border-line-strong bg-sand px-8 py-5 text-ink shadow-[0_6px_24px_rgba(43,42,37,0.06)] transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:text-ink hover:shadow-[0_14px_30px_rgba(43,42,37,0.12)]"
          >
            <span className="flex items-center gap-3">
              <GoogleG className="size-9" />
              <span className="font-serif text-[44px] font-medium leading-none">{rating}</span>
            </span>
            <span className="flex flex-col items-center gap-1.5 sm:items-start">
              <Stars value={googleReviews.rating} className="text-[20px]" />
              <span className="text-[13px] text-stone">
                {t("avis.reviewCount", { count: googleReviews.count })} {t("avis.onGoogle")}
              </span>
            </span>
            <span className="text-[12px] font-semibold uppercase tracking-[1px] text-clay transition-colors group-hover:text-rust">
              {t("avis.seeAll")} ↗
            </span>
          </a>
        </Reveal>
      </section>

      <section className="px-gutter pb-20 pt-10">
        <div className="mx-auto max-w-[1200px] columns-1 gap-7 md:columns-2 lg:columns-3">
          {reviews.map((r, i) => (
            <ReviewCard key={i} review={r} delay={(i % 3) * 90} />
          ))}
        </div>
      </section>

      <section className="px-gutter flex flex-wrap items-center justify-center gap-4 bg-sand py-16 text-center">
        <Button asChild variant="clay" size="pillLg">
          <a href={googleReviews.url} target="_blank" rel="noreferrer">
            {t("avis.seeAll")} ↗
          </a>
        </Button>
        {abritelUrl && (
          <Button asChild variant="textClay" className="px-4">
            <a href={abritelUrl} target="_blank" rel="noreferrer">
              {t("avis.all")}
            </a>
          </Button>
        )}
      </section>
    </>
  );
}
