import { useId } from "react";
import type { Lang } from "@/lib/locale";
import { cn } from "@/lib/utils";

/** Round flags drawn in SVG (emoji flags don't render on Windows). */
export function Flag({ lang, className }: { lang: Lang; className?: string }) {
  const id = useId();
  return (
    <span
      className={cn("block shrink-0 overflow-hidden rounded-full shadow-[0_0_0_1px_rgba(43,42,37,0.14)]", className)}
      aria-hidden="true"
    >
      {lang === "fr" && (
        <svg viewBox="0 0 3 3" preserveAspectRatio="none" className="block size-full">
          <rect width="1" height="3" fill="#002654" />
          <rect x="1" width="1" height="3" fill="#fff" />
          <rect x="2" width="1" height="3" fill="#CE1126" />
        </svg>
      )}
      {lang === "de" && (
        <svg viewBox="0 0 3 3" preserveAspectRatio="none" className="block size-full">
          <rect width="3" height="1" fill="#000" />
          <rect y="1" width="3" height="1" fill="#DD0000" />
          <rect y="2" width="3" height="1" fill="#FFCE00" />
        </svg>
      )}
      {lang === "en" && (
        <svg viewBox="0 0 60 30" preserveAspectRatio="xMidYMid slice" className="block size-full">
          <clipPath id={`${id}t`}>
            <path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z" />
          </clipPath>
          <rect width="60" height="30" fill="#012169" />
          <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6" />
          <path d="M0,0 L60,30 M60,0 L0,30" clipPath={`url(#${id}t)`} stroke="#C8102E" strokeWidth="4" />
          <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10" />
          <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6" />
        </svg>
      )}
    </span>
  );
}
