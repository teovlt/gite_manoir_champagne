import { useState, type CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import * as Dialog from "@radix-ui/react-dialog";
import { XIcon } from "lucide-react";
import googleReviews from "@shared/google-reviews.json";
import abritelReviews from "@shared/abritel-reviews.json";
import { GoogleG, ReviewerAvatar, Stars } from "@/components/site/reviews";
import { intlLocale, useLang, useTr, type Lang, type Translated } from "@/lib/locale";
import { cn } from "@/lib/utils";

export type ReviewSource = "google" | "abritel" | "guest";

export interface Review {
  author: string;
  /** Archived Abritel reviews carry no name: shown as "Verified guest" in every language. */
  anonymous?: boolean;
  rating: number;
  /** "YYYY-MM" or "YYYY" */
  visited?: string;
  /** Language the guest wrote in; any other language is a translation. */
  lang?: Lang | "nl";
  title?: Partial<Translated>;
  text: string | Partial<Translated>;
  source: ReviewSource;
}

export const reviewStats = {
  google: { rating: googleReviews.rating, count: googleReviews.count, url: googleReviews.url },
  abritel: { rating: abritelReviews.rating, count: abritelReviews.count, url: abritelReviews.url },
  total: googleReviews.count + abritelReviews.count,
};

const google: Review[] = googleReviews.reviews.map((r) => ({ ...r, lang: "fr", source: "google" }));
const abritel = abritelReviews.reviews as Omit<Review, "source">[];

/**
 * Every review, newest first within each source, then dealt alternately so Google and Abritel cards mix
 * on screen instead of running in two blocks. Reviews added in the admin are appended at the end.
 */
export function mergeReviews(extra: Review[] = []): Review[] {
  const byDate = (a: { visited?: string }, b: { visited?: string }) => (b.visited ?? "").localeCompare(a.visited ?? "");
  const g = [...google].sort(byDate);
  const a = abritel.map((r) => ({ ...r, source: "abritel" as const })).sort(byDate);
  const out: Review[] = [];
  // Abritel has about seven times more reviews: one Google card every few Abritel ones.
  const step = Math.max(1, Math.round(a.length / g.length));
  while (g.length || a.length) {
    if (g.length) out.push(g.shift()!);
    out.push(...a.splice(0, step));
  }
  return [...out, ...extra];
}

/** Abritel has no "G": a small wordmark chip in its blue tells the two sources apart at a glance. */
export const AbritelMark = ({ className }: { className?: string }) => (
  <span
    className={cn(
      "inline-flex items-center rounded-full bg-[#E4ECF8] px-2 py-[3px] text-[10px] font-bold uppercase leading-none tracking-[0.8px] text-[#1F4E9C]",
      className,
    )}
  >
    Abritel
  </span>
);

export const SourceMark = ({ source, className }: { source: ReviewSource; className?: string }) =>
  source === "google" ? (
    <GoogleG className={cn("size-[18px]", className)} />
  ) : source === "abritel" ? (
    <AbritelMark className={className} />
  ) : null;

function useReviewMeta(review: Review) {
  const { t } = useTranslation();
  const lang = useLang();
  let visited = "";
  if (review.visited) {
    const [y, m] = review.visited.split("-").map(Number);
    visited = m
      ? t("avis.visited", { date: new Date(y, m - 1, 15).toLocaleDateString(intlLocale[lang], { month: "long", year: "numeric" }) })
      : t("avis.visitedYear", { date: y });
  }
  const translated = review.lang && review.lang !== lang && typeof review.text !== "string";
  return {
    author: review.anonymous ? t("avis.anonymous") : review.author,
    visited,
    translated: translated ? t(`avis.translatedFrom.${review.lang}`) : "",
  };
}

function ReviewFooter({ review, compact }: { review: Review; compact?: boolean }) {
  const meta = useReviewMeta(review);
  return (
    <figcaption className="relative mt-auto flex items-center gap-3 border-t border-dashed border-ink/15 pt-4">
      <ReviewerAvatar name={meta.author} className={cn("ring-2 ring-white/70", compact && "size-9 text-[15px]")} />
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-[14px] font-semibold text-ink">{meta.author}</span>
        <span className="truncate text-[12px] text-stone">{meta.visited}</span>
        {meta.translated && <span className="truncate text-[11.5px] italic text-stone">{meta.translated}</span>}
      </span>
    </figcaption>
  );
}

/** Full review in a dialog: marquee cards are clamped, this is where long stories are read. */
function ReviewDialog({ review, open, onOpenChange }: { review: Review; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { t } = useTranslation();
  const tr = useTr();
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/45 backdrop-blur-[2px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[85vh] w-[min(620px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 flex-col gap-5 overflow-y-auto rounded-[22px] border border-line bg-cream p-8 shadow-[0_24px_60px_rgba(43,42,37,0.25)] focus:outline-none">
          <div className="flex items-center justify-between gap-3">
            <Stars value={review.rating} className="text-[16px]" />
            <span className="flex items-center gap-3">
              <SourceMark source={review.source} />
              <Dialog.Close
                className="rounded-full p-1.5 text-stone transition-colors hover:bg-sand hover:text-ink"
                aria-label={t("avis.close")}
              >
                <XIcon className="size-5" />
              </Dialog.Close>
            </span>
          </div>
          <Dialog.Title className="font-serif text-[24px] font-medium leading-tight text-ink">
            {review.title ? tr(review.title) : <span className="sr-only">{review.author}</span>}
          </Dialog.Title>
          <Dialog.Description asChild>
            <blockquote className="whitespace-pre-line font-serif text-[17px] leading-[1.7] text-ink">{tr(review.text)}</blockquote>
          </Dialog.Description>
          <ReviewFooter review={review} />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

const CLAMP = 210;

/**
 * Guestbook notes: each card takes a paper tone, a slight tilt and a strip of tape in turn, so a row reads
 * like pages pinned to a board rather than a grid of identical boxes. Hover straightens and lifts the card.
 */
const paperTones = ["bg-cream", "bg-moss-light", "bg-[#F6EBD3]", "bg-[#F5E4DA]"];
const tilts = ["-rotate-[1.2deg]", "rotate-[0.8deg]", "-rotate-[0.4deg]", "rotate-[1.4deg]", "rotate-[0.2deg]"];
const tapes = [
  "-rotate-[4deg] left-1/2 -translate-x-1/2",
  "rotate-[38deg] -right-3 top-2",
  "rotate-[3deg] left-1/2 -translate-x-1/2",
  "-rotate-[36deg] -left-3 top-2",
];

export function ReviewCard({ review, compact, index = 0 }: { review: Review; compact?: boolean; index?: number }) {
  const { t } = useTranslation();
  const tr = useTr();
  const [open, setOpen] = useState(false);
  const text = tr(review.text);
  const long = text.length > (compact ? CLAMP * 0.7 : CLAMP);

  return (
    <figure
      className={cn(
        "relative flex shrink-0 flex-col gap-3.5 rounded-[6px] border border-ink/[0.06] shadow-[0_1px_2px_rgba(43,42,37,0.06),0_10px_24px_-12px_rgba(43,42,37,0.25)] transition-[transform,box-shadow] duration-500 [transition-timing-function:cubic-bezier(.2,.8,.2,1)] hover:z-10 hover:-translate-y-2 hover:rotate-0 hover:scale-[1.02] hover:shadow-[0_2px_4px_rgba(43,42,37,0.06),0_28px_48px_-16px_rgba(43,42,37,0.35)]",
        paperTones[index % paperTones.length],
        tilts[index % tilts.length],
        compact ? "w-[300px] p-5 pt-6" : "w-[min(360px,82vw)] p-7 pt-8",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "absolute -top-2.5 h-6 w-20 bg-khaki/55 shadow-[0_1px_2px_rgba(43,42,37,0.08)] backdrop-blur-[1px]",
          tapes[index % tapes.length],
        )}
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute right-5 top-1 select-none font-serif text-[96px] leading-none text-clay/15"
      >
        ”
      </span>
      <div className="relative flex items-center justify-between gap-3">
        <Stars value={review.rating} className={compact ? "text-[13px]" : "text-[15px]"} />
        <SourceMark source={review.source} />
      </div>
      {review.title && !compact && (
        <p className="relative font-serif text-[20px] font-medium italic leading-snug text-ink">{tr(review.title)}</p>
      )}
      <blockquote className={cn("relative font-serif leading-[1.6] text-ink-soft", compact ? "text-[15px]" : "text-[16px]")}>
        <p className={compact ? "line-clamp-4" : "line-clamp-5"}>{text}</p>
      </blockquote>
      {long && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="group/more relative inline-flex items-center gap-1.5 self-start text-[12px] font-semibold uppercase tracking-[1px] text-clay transition-colors hover:text-rust"
        >
          {t("avis.readMore")}
          <span className="transition-transform group-hover/more:translate-x-1">→</span>
        </button>
      )}
      <ReviewFooter review={review} compact={compact} />
      {long && <ReviewDialog review={review} open={open} onOpenChange={setOpen} />}
    </figure>
  );
}

/**
 * One endless row of cards. The list is rendered twice and the track slides by exactly one copy (-50%),
 * so the loop is seamless; the copy is inert so keyboard and screen-reader users meet each review once.
 * Hover or focus pauses it; with reduced motion it becomes a plain horizontal scroller.
 */
export function ReviewMarquee({
  reviews,
  reverse,
  compact,
  offset = 0,
  secondsPerCard = 7,
}: {
  reviews: Review[];
  reverse?: boolean;
  compact?: boolean;
  /** Shifts the paper tones and tilts, so two stacked rows don't line up the same colours. */
  offset?: number;
  secondsPerCard?: number;
}) {
  // A short (filtered) list is repeated so one copy still spans wide screens and the loop never shows a gap.
  const items = reviews.length ? Array.from({ length: Math.ceil(8 / reviews.length) }, () => reviews).flat() : [];
  const style = { "--marquee-duration": `${items.length * secondsPerCard}s` } as CSSProperties;
  const cards = (clone: boolean) => (
    <div className="marquee-group flex shrink-0 items-center gap-7 pr-7" aria-hidden={clone || undefined} inert={clone || undefined}>
      {items.map((r, i) => {
        const repeat = i >= reviews.length;
        return (
          <div key={i} className="flex" aria-hidden={(!clone && repeat) || undefined} inert={(!clone && repeat) || undefined}>
            <ReviewCard review={r} compact={compact} index={i + offset} />
          </div>
        );
      })}
    </div>
  );
  return (
    <div className="marquee group/marquee relative overflow-hidden py-7" style={style}>
      <div className={cn("marquee-track flex w-max", reverse && "marquee-reverse")}>
        {cards(false)}
        {cards(true)}
      </div>
    </div>
  );
}

/**
 * What guests bring up most, matched on the French text of every review (all of them have one).
 * Counts are computed from the reviews themselves, so they stay true when reviews are added.
 */
export const reviewThemes = [
  { id: "welcome", pattern: /accueil|chaleureu|accueilli|adorable|charmant|gentil|sympa/ },
  { id: "farm", pattern: /ferme|lait|vache|traite|laitière/ },
  { id: "spa", pattern: /jacuzzi|\bspa\b|whirlpool/ },
  { id: "calm", pattern: /calme|paisible|tranquill|repos|détente/ },
  { id: "family", pattern: /famille|enfants|petits-enfants|anniversaire|amis/ },
  { id: "teurgoule", pattern: /teurgoule/ },
] as const;

export type ReviewThemeId = (typeof reviewThemes)[number]["id"];

const frenchText = (r: Review) =>
  [typeof r.title === "object" ? r.title.fr : "", typeof r.text === "string" ? r.text : r.text.fr].join(" ").toLowerCase();

export const matchesTheme = (r: Review, id: ReviewThemeId) => reviewThemes.find((th) => th.id === id)!.pattern.test(frenchText(r));
