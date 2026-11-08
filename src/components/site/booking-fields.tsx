import { useEffect, useRef, useState } from "react";
import { CalendarDays, Minus, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { CalendarLegend, RangeCalendar, useRangeLabel, type Range } from "@/components/site/availability-calendar";
import { fieldLabelClass } from "@/components/site/form-controls";
import { useSiteData } from "@/providers/site-data-provider";
import { intlLocale, useLang } from "@/lib/locale";
import { parseDate } from "@/lib/format";
import type { AvailabilityBlock } from "@/lib/types";
import { cn } from "@/lib/utils";

export const MAX_GUESTS = 14;

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => typeof window !== "undefined" && window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setMatches(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [query]);
  return matches;
}

interface DateRangeFieldProps {
  blocks: AvailabilityBlock[] | null;
  arrival: string;
  departure: string;
  onChange: (arrival: string, departure: string) => void;
  /** Classes of each of the two "inputs". */
  boxClassName?: string;
  labelClassName?: string;
  className?: string;
  idPrefix?: string;
}

/** Arrival + departure fields that open a calendar showing the booked nights. */
export function DateRangeField({
  blocks,
  arrival,
  departure,
  onChange,
  boxClassName,
  labelClassName,
  className,
  idPrefix = "dates",
}: DateRangeFieldProps) {
  const { t } = useTranslation();
  const lang = useLang();
  const label = useRangeLabel();
  const wide = useMediaQuery("(min-width: 700px)");
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  const range: Range = { start: arrival || null, end: departure || null };

  const display = (iso: string) => {
    const d = parseDate(iso).toLocaleDateString(intlLocale[lang], { weekday: "short", day: "numeric", month: "short" }).replace(/\./g, "");
    return d.charAt(0).toUpperCase() + d.slice(1);
  };

  const openCalendar = () => {
    // On phones the calendar opens below the fields: bring them up under the sticky header so it fits.
    const rect = anchorRef.current?.getBoundingClientRect();
    if (rect && window.innerHeight - rect.bottom < 480) {
      const header = document.querySelector("header")?.getBoundingClientRect().height ?? 0;
      window.scrollBy({ top: rect.top - header - 40, behavior: "instant" });
    }
    setOpen(true);
  };

  const change = (r: Range) => {
    onChange(r.start ?? "", r.end ?? "");
    if (r.start && r.end) setTimeout(() => setOpen(false), 180);
  };

  const box = (id: string, labelText: string, value: string) => (
    <div className="flex min-w-0 flex-col gap-1.5">
      <span id={`${idPrefix}-${id}-label`} className={cn(fieldLabelClass, labelClassName)}>
        {labelText}
      </span>
      <button
        type="button"
        aria-labelledby={`${idPrefix}-${id}-label`}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={openCalendar}
        className={cn("flex items-center gap-2 text-left", boxClassName, open && "border-sage-dark ring-[3px] ring-sage/40")}
      >
        <CalendarDays className="size-4 shrink-0 text-stone" aria-hidden="true" />
        <span className={cn("truncate", !value && "text-pebble")}>{value ? display(value) : t("booking.pickDate")}</span>
      </button>
    </div>
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div ref={anchorRef} className={cn("grid grid-cols-2 gap-x-3 sm:gap-x-4", className)}>
          {box("arrival", t("booking.arrival"), arrival)}
          {box("departure", t("booking.departure"), departure)}
        </div>
      </PopoverAnchor>
      <PopoverContent
        aria-label={t("calendar.title")}
        collisionPadding={16}
        // Clicking the other date box while open must not close the calendar.
        onInteractOutside={(e) => anchorRef.current?.contains(e.target as Node) && e.preventDefault()}
        className={cn("p-4 sm:p-5", wide ? "w-[640px]" : "w-[min(340px,calc(100vw-32px))]")}
      >
        <RangeCalendar
          blocks={blocks}
          value={range}
          onChange={change}
          months={wide ? 2 : 1}
          compact
          header={
            wide ? (
              <CalendarLegend />
            ) : (
              <span className="text-[13px] text-umber">
                {range.start && !range.end ? t("calendar.selectDeparture") : t("calendar.selectArrival")}
              </span>
            )
          }
        />
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-3 text-[13px]">
          <span className="min-w-0 text-umber" aria-live="polite">
            {range.start ? label(range) : wide ? t("calendar.selectArrival") : <CalendarLegend className="justify-start gap-3" />}
          </span>
          {range.start && (
            <button type="button" onClick={() => onChange("", "")} className="shrink-0 font-semibold text-umber hover:text-ink">
              {t("calendar.clear")}
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface StepperProps {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  boxClassName?: string;
  labelClassName?: string;
}

/** − value + counter, nicer than a number input on phones. */
export function GuestStepper({ id, label, value, min, max, onChange, boxClassName, labelClassName }: StepperProps) {
  const { t } = useTranslation();
  const btn =
    "flex size-8 shrink-0 items-center justify-center rounded-full border border-line-strong text-umber transition hover:border-sage-dark hover:text-ink disabled:pointer-events-none disabled:opacity-35";
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <span id={`${id}-label`} className={cn(fieldLabelClass, labelClassName)}>
        {label}
      </span>
      <div role="group" aria-labelledby={`${id}-label`} className={cn("flex items-center justify-between gap-1 !py-[7px]", boxClassName)}>
        <button
          type="button"
          className={btn}
          onClick={() => onChange(value - 1)}
          disabled={value <= min}
          aria-label={t("booking.less", { label })}
        >
          <Minus className="size-3.5" />
        </button>
        <output id={id} aria-live="polite" className="min-w-6 text-center text-[15px] font-semibold tabular-nums">
          {value}
        </output>
        <button
          type="button"
          className={btn}
          onClick={() => onChange(value + 1)}
          disabled={value >= max}
          aria-label={t("booking.more", { label })}
        >
          <Plus className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

/** Adults + children counters sharing the house capacity. */
export function GuestFields({
  adults,
  children,
  onChange,
  boxClassName,
  labelClassName,
  idPrefix = "g",
}: {
  adults: number;
  children: number;
  onChange: (adults: number, children: number) => void;
  boxClassName?: string;
  labelClassName?: string;
  idPrefix?: string;
}) {
  const { t } = useTranslation();
  return (
    <>
      <GuestStepper
        id={`${idPrefix}-adultes`}
        label={t("booking.adults")}
        value={adults}
        min={1}
        max={MAX_GUESTS - children}
        onChange={(n) => onChange(n, children)}
        boxClassName={boxClassName}
        labelClassName={labelClassName}
      />
      <GuestStepper
        id={`${idPrefix}-enfants`}
        label={t("booking.children")}
        value={children}
        min={0}
        max={MAX_GUESTS - adults}
        onChange={(n) => onChange(adults, n)}
        boxClassName={boxClassName}
        labelClassName={labelClassName}
      />
    </>
  );
}

/** Cheapest formula, to show "stays from …" without opening the pricing page. */
export function useCheapestFormula() {
  const { formulas } = useSiteData().data.pricing;
  return formulas.length ? formulas.reduce((a, b) => (b.low < a.low ? b : a)) : null;
}
