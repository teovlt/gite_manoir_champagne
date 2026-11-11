import { usePhoto, useSiteData } from "@/providers/site-data-provider";
import { Typo } from "@/lib/format";
import { useTr } from "@/lib/locale";
import { cn } from "@/lib/utils";
import { Accent, SageStripe } from "./ornaments";
import { PhotoCredit } from "./photo-credit";

interface PageHeroProps {
  eyebrow: string;
  title: string;
  subtitle?: string;
  /** Photo slot. */
  photoSlot?: string;
  /** Slot used while `photoSlot` is empty (or when the page has no slot of its own). */
  fallbackSlot?: string;
  /**
   * Two more slots shown stacked beside the main photo on large screens, so each picture keeps a
   * size close to its own instead of one photo stretched across the whole width.
   */
  sideSlots?: [string, string];
  minHeight?: number;
  children?: React.ReactNode;
}

/** Line drawing of the manor in its bocage, for heroes without a photo. */
const ManorSketch = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 520 300" fill="none" className={className} aria-hidden="true">
    <circle cx="398" cy="78" r="34" className="fill-wheat-light/70" />
    <path d="M0 238 C80 205 150 214 230 230 S390 248 520 212 V300 H0 Z" className="fill-sage/25" />
    <path d="M0 262 C110 236 210 250 300 262 S450 270 520 252 V300 H0 Z" className="fill-sage/35" />
    <g className="stroke-sage-dark" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {/* main house */}
      <path d="M150 236 V150 H330 V236" />
      <path d="M140 152 L184 104 H296 L340 152" />
      <path d="M200 104 V82 H214 V104 M268 104 V82 H282 V104" />
      {/* windows & door */}
      <path d="M174 170 h22 v26 h-22 z M224 170 h22 v26 h-22 z M284 170 h22 v26 h-22 z" />
      <path d="M174 124 h18 v16 h-18 z M288 124 h18 v16 h-18 z" />
      <path d="M232 236 v-26 a8 8 0 0 1 16 0 v26" />
      {/* porch */}
      <path d="M372 236 V188 a22 22 0 0 1 44 0 V236 M366 188 h56" />
      <path d="M330 236 H372 M416 236 H440" />
      {/* trees */}
      <path d="M86 236 V200 M86 200 c-26 0 -30 -40 -6 -48 c4 -22 34 -20 36 2 c18 10 10 46 -30 46" />
      <path d="M470 232 V204 M470 204 c-18 0 -22 -30 -2 -34 c6 -14 26 -10 26 4 c12 10 4 30 -24 30" />
    </g>
    <path
      d="M60 60 q8 -6 16 0 q8 -6 16 0 M110 40 q6 -4 12 0 q6 -4 12 0"
      className="stroke-stone/50"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
  </svg>
);

export function PageHero({ eyebrow, title, subtitle, photoSlot, fallbackSlot, sideSlots, minHeight = 460, children }: PageHeroProps) {
  const own = usePhoto(photoSlot ?? "");
  const fallback = usePhoto(fallbackSlot ?? "");
  const { data } = useSiteData();
  const photo = own?.url ? own : fallback;
  const tr = useTr();
  const withPhoto = Boolean(photo?.url);
  // The mosaic only shows when both side photos exist; otherwise the main photo fills the hero.
  const side = (sideSlots ?? []).map((s) => data.photos.find((p) => p.key === s)).filter((p) => p?.url);
  const mosaic = withPhoto && side.length === 2;

  return (
    <>
      <section
        className={cn(
          "relative flex items-center overflow-hidden",
          !withPhoto &&
            "bg-sand bg-[radial-gradient(ellipse_at_85%_15%,rgba(243,221,184,0.75),transparent_55%),radial-gradient(ellipse_at_0%_100%,rgba(168,184,156,0.28),transparent_60%)]",
        )}
        style={{ minHeight }}
      >
        {withPhoto ? (
          <>
            <div className={cn("absolute inset-0 overflow-hidden", mosaic && "lg:right-[38%]")}>
              <img
                src={photo!.url!}
                alt={tr(photo!.alt)}
                fetchPriority="high"
                className="photo-warm hero-zoom absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(35,24,14,0.5)_0%,rgba(35,24,14,0.12)_65%),linear-gradient(180deg,rgba(43,42,37,0)_0%,rgba(35,24,14,0.38)_100%)]" />
              <PhotoCredit url={photo!.url} className="bottom-2.5 right-4" />
            </div>
            {mosaic && (
              <div className="absolute inset-y-0 right-0 hidden w-[38%] grid-rows-2 gap-1 bg-cream pl-1 lg:grid">
                {side.map((p, i) => (
                  <div key={p!.key} className="relative overflow-hidden">
                    <img
                      src={p!.url!}
                      alt={tr(p!.alt)}
                      fetchPriority={i === 0 ? "high" : undefined}
                      className="photo-warm hero-zoom absolute inset-0 h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(43,42,37,0)_55%,rgba(35,24,14,0.25)_100%)]" />
                    <PhotoCredit url={p!.url} className="bottom-2 right-3" />
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <div
              className="absolute inset-0 bg-[radial-gradient(rgba(126,149,116,0.16)_1px,transparent_1px)] [background-size:18px_18px] [mask-image:linear-gradient(90deg,transparent_30%,black)]"
              aria-hidden="true"
            />
            <ManorSketch className="hero-float absolute bottom-0 right-[-6%] w-[min(560px,70%)] opacity-40 sm:right-[2%] sm:opacity-90" />
          </>
        )}
        <div
          className={cn(
            "px-gutter relative z-[2] max-w-[760px] py-16 animate-in fade-in-0 slide-in-from-bottom-4 duration-700",
            mosaic && "lg:max-w-[min(760px,62%)]",
          )}
        >
          <span className={cn("text-[13px] uppercase tracking-[2px]", withPhoto ? "text-wheat-light" : "font-semibold text-clay")}>
            {eyebrow}
          </span>
          <Accent size="lg" className="mt-[18px]" />
          <h1
            className={cn(
              "mt-4 font-serif text-[clamp(32px,4.5vw,52px)] font-medium leading-[1.1]",
              withPhoto ? "text-cream [text-shadow:0_2px_18px_rgba(0,0,0,0.25)]" : "text-ink",
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
