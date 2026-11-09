import { photoCredits } from "@/lib/photo-credits";
import { cn } from "@/lib/utils";

/** Small "Photo : author · licence" link laid over the bottom-right corner of a photo, when its licence asks for it. */
export function PhotoCredit({ url, className }: { url?: string | null; className?: string }) {
  const credit = url ? photoCredits[url] : undefined;
  if (!credit) return null;
  return (
    <a
      href={credit.href}
      target="_blank"
      rel="noreferrer"
      className={cn(
        "absolute bottom-1.5 right-2.5 z-[3] max-w-[calc(100%-20px)] truncate text-[10px] leading-tight text-cream/85 [text-shadow:0_1px_4px_rgba(35,24,14,0.8)] hover:text-cream hover:underline",
        className,
      )}
    >
      {credit.text}
    </a>
  );
}
