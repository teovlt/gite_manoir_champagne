import { usePhoto } from "@/providers/site-data-provider";
import { Typo } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Accent, SageStripe } from "./ornaments";

interface PageHeroProps {
  eyebrow: string;
  title: string;
  subtitle?: string;
  /** Photo slot. When the slot is empty the hero falls back to the plain sand variant. */
  photoSlot?: string;
  minHeight?: number;
  /** Small label shown top-right on the plain variant (photo still to come). */
  placeholderLabel?: string;
  children?: React.ReactNode;
}

export function PageHero({ eyebrow, title, subtitle, photoSlot, minHeight = 460, placeholderLabel, children }: PageHeroProps) {
  const photo = usePhoto(photoSlot ?? "");
  const withPhoto = Boolean(photo?.url);

  return (
    <>
      <section className={cn("relative flex items-center overflow-hidden", !withPhoto && "bg-sand")} style={{ minHeight }}>
        {withPhoto && (
          <>
            <img src={photo!.url!} alt={photo!.alt} className="photo-warm absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(43,42,37,0)_0%,rgba(35,24,14,0.38)_100%)]" />
          </>
        )}
        {!withPhoto && placeholderLabel && (
          <span className="absolute right-6 top-[22px] z-[2] rounded-full bg-wheat px-3 py-1.5 text-[11px] uppercase tracking-[1px] text-ink-soft">
            Photo — {placeholderLabel}
          </span>
        )}
        <div className="px-gutter relative z-[2] max-w-[760px] py-16">
          <span className={cn("text-[13px] uppercase tracking-[2px]", withPhoto ? "text-wheat-light" : "text-clay")}>{eyebrow}</span>
          <Accent size="lg" className="mt-[18px]" />
          <h1
            className={cn(
              "mt-4 font-serif text-[clamp(32px,4.5vw,52px)] font-medium leading-[1.1]",
              withPhoto ? "text-cream" : "text-ink",
            )}
          >
            <Typo text={title} />
          </h1>
          {subtitle && (
            <p className={cn("mt-4 max-w-[560px] text-base leading-relaxed", withPhoto ? "text-[#F6EEDC]" : "text-ink-soft")}>{subtitle}</p>
          )}
          {children}
        </div>
      </section>
      <SageStripe />
    </>
  );
}
