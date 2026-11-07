import { cn } from "@/lib/utils";

/** Two-tone sage band displayed under each hero. */
export const SageStripe = () => (
  <div className="flex h-3" aria-hidden="true">
    <div className="flex-1 bg-sage" />
    <div className="flex-1 bg-sage-dark" />
  </div>
);

/** The sage "pill dashes" used as a section accent. */
export const Accent = ({ size = "sm", className }: { size?: "sm" | "lg"; className?: string }) => (
  <div className={cn("flex", size === "lg" ? "gap-2" : "gap-1.5", className)} aria-hidden="true">
    <span className={cn("block rounded-full bg-sage", size === "lg" ? "h-2 w-[52px]" : "h-1 w-7")} />
    <span className={cn("block rounded-full bg-sage-dark", size === "lg" ? "h-2 w-[26px]" : "h-1 w-3.5")} />
  </div>
);

export const Eyebrow = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <span className={cn("text-[13px] font-semibold uppercase tracking-[2px] text-clay", className)}>{children}</span>
);

export const SectionTitle = ({ children, className, as: Tag = "h2" }: { children: React.ReactNode; className?: string; as?: "h2" | "h3" }) => (
  <Tag className={cn("font-serif text-[28px] font-medium leading-tight", className)}>{children}</Tag>
);

export const Logo = ({ size = 44 }: { size?: number }) => (
  <span
    className="flex shrink-0 items-center justify-center rounded-full bg-sage-dark font-serif text-cream"
    style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}
  >
    MC
  </span>
);
