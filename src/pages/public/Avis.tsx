import { useState, type ReactNode } from "react";
import { Bath, CakeSlice, HeartHandshake, Leaf, Milk, Users, type LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { PageHero } from "@/components/site/page-hero";
import { Reveal } from "@/components/site/reveal";
import { usePageText, useSiteData } from "@/providers/site-data-provider";
import { usePageMeta } from "@/lib/use-page-meta";
import { cn } from "@/lib/utils";
import { GoogleG, Stars, formatRating } from "@/components/site/reviews";
import { Accent, Eyebrow, SectionTitle } from "@/components/site/ornaments";
import { SitePhoto } from "@/components/site/site-photo";
import {
  AbritelMark,
  ReviewMarquee,
  matchesTheme,
  mergeReviews,
  reviewStats,
  reviewThemes,
  type Review,
  type ReviewThemeId,
} from "@/components/site/review-wall";
import { useLang, useTr } from "@/lib/locale";

const themeIcons: Record<ReviewThemeId, LucideIcon> = {
  welcome: HeartHandshake,
  farm: Milk,
  spa: Bath,
  calm: Leaf,
  family: Users,
  teurgoule: CakeSlice,
};

function ThemeChip({
  active,
  onClick,
  icon: Icon,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  icon?: LucideIcon;
  label: string;
  count?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "group flex items-center gap-3 rounded-full border py-2 pl-2 pr-5 text-left transition-all duration-300",
        active
          ? "border-clay bg-clay text-cream shadow-[0_10px_24px_-10px_rgba(190,106,69,0.8)]"
          : "border-line-strong bg-cream text-ink hover:-translate-y-0.5 hover:border-clay/50 hover:shadow-[0_8px_18px_-10px_rgba(43,42,37,0.35)]",
      )}
    >
      <span
        className={cn(
          "flex size-9 items-center justify-center rounded-full transition-colors",
          active ? "bg-cream/20 text-cream" : "bg-sand text-clay group-hover:bg-clay/10",
        )}
      >
        {Icon ? <Icon className="size-[18px]" strokeWidth={1.8} /> : <span className="font-serif text-[15px]">✦</span>}
      </span>
      <span className="flex flex-col leading-tight">
        <span className="text-[14px] font-semibold">{label}</span>
        {count && <span className={cn("text-[11.5px]", active ? "text-cream/80" : "text-stone")}>{count}</span>}
      </span>
    </button>
  );
}

function SourceScore({
  href,
  logo,
  score,
  stars,
  label,
  cta,
}: {
  href: string;
  logo: ReactNode;
  score: string;
  stars: number;
  label: string;
  cta: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="group flex flex-1 basis-[260px] flex-col items-center gap-3 rounded-[20px] border border-line-strong bg-cream px-7 py-6 text-ink shadow-[0_6px_24px_rgba(43,42,37,0.06)] transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:text-ink hover:shadow-[0_14px_30px_rgba(43,42,37,0.12)]"
    >
      <span className="flex h-9 items-center">{logo}</span>
      <span className="font-serif text-[46px] font-medium leading-none">{score}</span>
      <Stars value={stars} className="text-[18px]" />
      <span className="text-[13px] text-stone">{label}</span>
      <span className="text-[11.5px] font-semibold uppercase tracking-[1px] text-clay transition-colors group-hover:text-rust">
        {cta} ↗
      </span>
    </a>
  );
}

export function Avis() {
  const { t } = useTranslation();
  const lang = useLang();
  const text = usePageText("avis");
  const abritelUrl = useSiteData().data.settings.abritelUrl || reviewStats.abritel.url;
  usePageMeta();

  // Owners can add extra reviews in the admin, on top of the Google and Abritel ones.
  const extra: Review[] = [1, 2, 3, 4, 5, 6]
    .map((i) => ({ text: text(`review${i}`), author: text(`author${i}`), rating: 5, source: "guest" as const }))
    .filter((r) => r.text && !r.text.startsWith("["));
  const all = mergeReviews(extra);
  const [theme, setTheme] = useState<ReviewThemeId | null>(null);
  const reviews = theme ? all.filter((r) => matchesTheme(r, theme)) : all;
  // Two rows running in opposite directions, each taking every other review.
  const rows = [reviews.filter((_, i) => i % 2 === 0), reviews.filter((_, i) => i % 2 === 1)];
  const { google, abritel } = reviewStats;
  const tr = useTr();
  const featured = all.find((r) => r.author === "Richard W.");

  return (
    <>
      <PageHero
        eyebrow={t("avis.eyebrow")}
        title={t("avis.title")}
        photoSlot="accueil.hero"
        sideSlots={["gite.hero-3", "jardins.hero-2"]}
        minHeight={400}
      />

      <section className="px-gutter pb-4 pt-14">
        <Reveal className="mx-auto flex max-w-[860px] flex-col items-center gap-8 text-center">
          <p className="text-[15px] leading-[1.75] text-ink-soft">{text("intro")}</p>
          <p className="font-serif text-[26px] italic leading-snug text-ink">{t("avis.total", { count: reviewStats.total })}</p>
          <div className="flex w-full flex-wrap justify-center gap-5">
            <SourceScore
              href={google.url}
              logo={<GoogleG className="size-8" />}
              score={`${formatRating(google.rating, lang)}/5`}
              stars={google.rating}
              label={`${t("avis.reviewCount", { count: google.count })} ${t("avis.onGoogle")}`}
              cta={t("avis.seeAll")}
            />
            <SourceScore
              href={abritelUrl}
              logo={<AbritelMark className="px-3 py-1.5 text-[13px]" />}
              score={`${formatRating(abritel.rating, lang).replace(/[.,]0$/, "")}/10`}
              stars={abritel.rating / 2}
              label={`${t("avis.reviewCount", { count: abritel.count })} ${t("avis.onAbritel")}`}
              cta={t("avis.seeAbritel")}
            />
          </div>
        </Reveal>
      </section>

      <section className="review-board pb-14 pt-16" aria-label={t("avis.title")}>
        <Reveal className="px-gutter mx-auto mb-6 flex max-w-[1100px] flex-col items-center gap-3 text-center">
          <Eyebrow>{t("avis.themes.eyebrow")}</Eyebrow>
          <SectionTitle className="text-[34px]">{t("avis.themes.title")}</SectionTitle>
          <Accent className="justify-center" />
          <p className="max-w-[560px] text-[14.5px] text-ink-soft">{t("avis.themes.lead")}</p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <ThemeChip
              active={!theme}
              onClick={() => setTheme(null)}
              label={t("avis.themes.all")}
              count={t("avis.reviewCount", { count: all.length })}
            />
            {reviewThemes.map(({ id }) => (
              <ThemeChip
                key={id}
                active={theme === id}
                onClick={() => setTheme(theme === id ? null : id)}
                icon={themeIcons[id]}
                label={t(`avis.themes.${id}`)}
                count={t("avis.themes.count", { count: all.filter((r) => matchesTheme(r, id)).length })}
              />
            ))}
          </div>
        </Reveal>
        {/* Keyed on the theme so the rows restart from the first matching card. */}
        <div key={theme ?? "all"} className="review-rows flex flex-col">
          <ReviewMarquee reviews={rows[0]} />
          {rows[1].length > 0 && <ReviewMarquee reviews={rows[1]} reverse offset={2} />}
        </div>
        <p className="px-gutter mt-4 text-center text-[12.5px] text-stone">{t("avis.hint")}</p>
      </section>

      {featured?.title && (
        <section className="relative isolate overflow-hidden">
          <SitePhoto slot="jardins.hero" className="absolute inset-0 -z-10 h-full w-full" />
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-ink/80 via-ink/55 to-ink/25" />
          <Reveal as="figure" className="px-gutter mx-auto flex max-w-[1100px] flex-col gap-6 py-24 text-cream md:py-32">
            <span className="font-serif text-[120px] leading-[0.5] text-clay" aria-hidden="true">
              “
            </span>
            <blockquote className="max-w-[760px] font-serif text-[clamp(30px,4.6vw,54px)] font-medium italic leading-[1.12]">
              {tr(featured.title)}
            </blockquote>
            <figcaption className="flex items-center gap-3 text-[14px] text-cream/85">
              <span className="h-px w-10 bg-clay" aria-hidden="true" />
              {featured.author} · Abritel · {featured.visited?.slice(0, 4)}
            </figcaption>
          </Reveal>
        </section>
      )}

      <section className="px-gutter flex flex-wrap items-center justify-center gap-4 bg-sand py-16 text-center">
        <Button asChild variant="clay" size="pillLg">
          <a href={google.url} target="_blank" rel="noreferrer">
            {t("avis.seeAll")} ↗
          </a>
        </Button>
        <Button asChild variant="textClay" className="px-4">
          <a href={abritelUrl} target="_blank" rel="noreferrer">
            {t("avis.seeAbritel")} ↗
          </a>
        </Button>
      </section>
    </>
  );
}
