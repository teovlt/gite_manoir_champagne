import { useTranslation } from "react-i18next";
import { Images } from "lucide-react";
import { useSiteData } from "@/providers/site-data-provider";
import { useTr } from "@/lib/locale";
import type { Photo } from "@/lib/types";
import { cn } from "@/lib/utils";
import { photoCredits } from "@/lib/photo-credits";
import { useLightbox } from "./lightbox";
import { PhotoCredit } from "./photo-credit";

interface SitePhotoProps {
  /** Slot key from shared/photos.json */
  slot: string;
  className?: string;
  imgClassName?: string;
  contain?: boolean;
  /** Opens the photo full screen on click. */
  zoomable?: boolean;
  /** Other slots of the same room: the lightbox then browses them all, starting with this photo. */
  gallery?: string[];
  /** Rendered when the slot has no image yet. Defaults to a labelled placeholder. */
  fallback?: React.ReactNode;
}

/** Filled photos of the given slots, ready for the lightbox. */
export function useSlotImages(slots: string[]) {
  const { data } = useSiteData();
  const tr = useTr();
  return slots
    .map((s) => data.photos.find((p) => p.key === s))
    .filter((p): p is Photo & { url: string } => Boolean(p?.url))
    .map((p) => ({ url: p.url, alt: tr(p.alt) }));
}

const Placeholder = ({ label, className }: { label: string; className?: string }) => (
  <div className={cn("flex items-center justify-center border border-khaki bg-wheat p-3 text-center text-[13px] text-taupe", className)}>
    Photo — {label}
  </div>
);

/** An image slot editable from the admin "Photos & médias" screen. */
export function SitePhoto({ slot, className, imgClassName, contain, zoomable, gallery = [], fallback }: SitePhotoProps) {
  const { data } = useSiteData();
  const tr = useTr();
  const { t } = useTranslation();
  const lightbox = useLightbox();
  const photo = data.photos.find((p) => p.key === slot);
  const alt = tr(photo?.alt);
  const images = useSlotImages([slot, ...gallery.filter((s) => s !== slot)]);

  if (!photo?.url) return fallback ?? <Placeholder label={alt || slot} className={className} />;

  const img = (
    <img
      src={photo.url}
      alt={alt}
      loading="lazy"
      decoding="async"
      className={cn("block h-full w-full", contain ? "bg-white object-contain" : "photo-warm object-cover", imgClassName)}
    />
  );

  const credited = Boolean(photoCredits[photo.url]);
  const frame = !zoomable ? (
    <div className={cn("overflow-hidden", credited ? "h-full w-full" : className)}>{img}</div>
  ) : (
    <button
      type="button"
      onClick={() => lightbox.open(images, 0)}
      className={cn("zoom-frame relative block cursor-zoom-in overflow-hidden", credited ? "h-full w-full" : className)}
      aria-label={t("lightbox.open", { alt })}
    >
      {img}
      {images.length > 1 && (
        <span className="pointer-events-none absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full bg-ink/60 px-3 py-1.5 text-[12px] font-semibold text-cream backdrop-blur-sm">
          <Images className="size-3.5" aria-hidden="true" />
          {t("gite.photos", { count: images.length })}
        </span>
      )}
    </button>
  );
  if (!credited) return frame;
  // The credit is a link: it can't live inside the zoom button, so both share a positioned wrapper.
  return (
    <div className={cn("relative overflow-hidden", className)}>
      {frame}
      <PhotoCredit url={photo.url} />
    </div>
  );
}

interface PhotoGridProps {
  slots?: string[];
  extras?: Photo[];
  className?: string;
  tileClassName?: string;
}

/** A grid of photos sharing one lightbox (arrows go through the whole grid). */
export function PhotoGrid({ slots = [], extras = [], className, tileClassName }: PhotoGridProps) {
  const { data } = useSiteData();
  const tr = useTr();
  const { t } = useTranslation();
  const lightbox = useLightbox();

  const items = [
    ...slots.map((s) => data.photos.find((p) => p.key === s) ?? ({ key: s, alt: { fr: s, en: s, de: s }, url: null } as unknown as Photo)),
    ...extras,
  ];
  const images = items.filter((p) => p.url).map((p) => ({ url: p.url!, alt: tr(p.alt) }));

  return (
    <div className={className}>
      {items.map((p, i) =>
        p.url ? (
          <button
            key={p.id ?? p.key ?? i}
            type="button"
            onClick={() =>
              lightbox.open(
                images,
                images.findIndex((img) => img.url === p.url),
              )
            }
            className={cn("zoom-frame block cursor-zoom-in overflow-hidden", tileClassName)}
            aria-label={t("lightbox.open", { alt: tr(p.alt) })}
          >
            <img src={p.url} alt={tr(p.alt)} loading="lazy" decoding="async" className="photo-warm block h-full w-full object-cover" />
          </button>
        ) : (
          <Placeholder key={p.key ?? i} label={tr(p.alt)} className={tileClassName} />
        ),
      )}
    </div>
  );
}
