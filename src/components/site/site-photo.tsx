import { usePhoto } from "@/providers/site-data-provider";
import { cn } from "@/lib/utils";

interface SitePhotoProps {
  /** Slot key from shared/photos.json */
  slot: string;
  className?: string;
  imgClassName?: string;
  contain?: boolean;
  /** Rendered when the slot has no image yet. Defaults to a labelled placeholder. */
  fallback?: React.ReactNode;
}

/** An image slot editable from the admin "Photos & médias" screen. */
export function SitePhoto({ slot, className, imgClassName, contain, fallback }: SitePhotoProps) {
  const photo = usePhoto(slot);

  if (!photo?.url) {
    return (
      fallback ?? (
        <div
          className={cn(
            "flex items-center justify-center border border-khaki bg-wheat p-3 text-center text-[13px] text-taupe",
            className,
          )}
        >
          Photo — {photo?.alt ?? slot}
        </div>
      )
    );
  }

  return (
    <div className={cn("overflow-hidden", className)}>
      <img
        src={photo.url}
        alt={photo.alt}
        loading="lazy"
        className={cn("block h-full w-full", contain ? "bg-white object-contain" : "photo-warm object-cover", imgClassName)}
      />
    </div>
  );
}
