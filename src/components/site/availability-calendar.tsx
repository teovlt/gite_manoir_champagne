import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { intlLocale, useLang } from "@/lib/locale";
import { nightsBetween, parseDate, toISODate, todayISO } from "@/lib/format";
import type { AvailabilityBlock } from "@/lib/types";
import { cn } from "@/lib/utils";

/** A night is booked when some block covers it: block.start <= night < block.end. */
export const isNightBooked = (blocks: AvailabilityBlock[], day: string) => blocks.some((b) => b.start <= day && day < b.end);

const bookedPattern = "bg-[repeating-linear-gradient(135deg,#EADFC2_0_3px,#F6EEDC_3px_6px)]";

function monthDays(year: number, month: number) {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7; // Monday first
  const count = new Date(year, month + 1, 0).getDate();
  return { offset, days: Array.from({ length: count }, (_, i) => toISODate(new Date(year, month, i + 1))) };
}

/** First booked night on or after `from`, or null when the calendar is free from there on. */
function firstBookedFrom(blocks: AvailabilityBlock[], from: string) {
  let first: string | null = null;
  for (const b of blocks) {
    const candidate = b.start > from ? b.start : b.end > from ? from : null;
    if (candidate && (!first || candidate < first)) first = candidate;
  }
  return first;
}

export interface Range {
  start: string | null;
  end: string | null;
}

/** "Du 4 au 11 juillet 2026 · 7 nuits" */
export function useRangeLabel() {
  const { t } = useTranslation();
  const lang = useLang();
  return ({ start, end }: Range) => {
    if (!start) return "";
    const day = (iso: string, withYear = false) =>
      parseDate(iso).toLocaleDateString(intlLocale[lang], { day: "numeric", month: "long", ...(withYear ? { year: "numeric" } : {}) });
    if (!end) return t("booking.datesStart", { start: day(start, true) });
    return `${t("booking.datesFrom", { start: day(start), end: day(end, true) })} · ${t("calendar.nights", { count: nightsBetween(start, end) })}`;
  };
}

export const CalendarLegend = ({ className }: { className?: string }) => {
  const { t } = useTranslation();
  return (
    <div className={cn("flex flex-wrap items-center justify-center gap-4 text-xs text-umber", className)}>
      <span className="flex items-center gap-1.5">
        <span className="size-3 rounded-sm border border-line-strong bg-cream" /> {t("calendar.free")}
      </span>
      <span className="flex items-center gap-1.5">
        <span className={cn("size-3 rounded-sm", bookedPattern)} /> {t("calendar.booked")}
      </span>
      <span className="flex items-center gap-1.5">
        <span className="size-3 rounded-sm bg-sage-dark" /> {t("calendar.selected")}
      </span>
    </div>
  );
};

interface RangeCalendarProps {
  blocks: AvailabilityBlock[] | null;
  value: Range;
  onChange: (range: Range) => void;
  months?: number;
  /** Shown between the two arrows (e.g. the legend). */
  header?: React.ReactNode;
  compact?: boolean;
}

/**
 * Month grids where the visitor picks an arrival then a departure.
 * Booked nights can't be an arrival, and once the arrival is set, days past the next booking are disabled.
 */
export function RangeCalendar({ blocks, value, onChange, months = 2, header, compact }: RangeCalendarProps) {
  const { t } = useTranslation();
  const lang = useLang();
  const today = todayISO();
  const initial = value.start ? parseDate(value.start) : new Date();
  const now = new Date();
  const [cursor, setCursor] = useState({ y: initial.getFullYear(), m: initial.getMonth() });
  const [hover, setHover] = useState<string | null>(null);
  const booked = blocks ?? [];
  const { start, end } = value;
  const pickingDeparture = !!start && !end;
  // While choosing the departure, the stay can't run past the next booked night.
  const limit = pickingDeparture ? firstBookedFrom(booked, start) : null;

  const weekdays = useMemo(() => {
    const f = new Intl.DateTimeFormat(intlLocale[lang], { weekday: "short" });
    return Array.from({ length: 7 }, (_, i) => f.format(new Date(2024, 0, 1 + i))); // 2024-01-01 is a Monday
  }, [lang]);
  const monthName = (y: number, m: number) =>
    new Intl.DateTimeFormat(intlLocale[lang], { month: "long", year: "numeric" }).format(new Date(y, m, 1));

  const shift = (delta: number) => setCursor(({ y, m }) => ({ y: y + Math.floor((m + delta) / 12), m: (((m + delta) % 12) + 12) % 12 }));
  const atStart = cursor.y === now.getFullYear() && cursor.m === now.getMonth();

  const isDisabled = (day: string) => {
    if (day < today) return true;
    if (pickingDeparture && day > start) return !!limit && day > limit;
    return isNightBooked(booked, day);
  };

  const pick = (day: string) => {
    if (isDisabled(day)) return;
    if (pickingDeparture && day > start) return onChange({ start, end: day });
    onChange({ start: day, end: null });
  };

  const rangeEnd = end ?? (pickingDeparture && hover && hover > start && !isDisabled(hover) ? hover : null);
  const inRange = (day: string) => !!start && !!rangeEnd && day > start && day < rangeEnd;
  const arrowClass =
    "flex size-10 shrink-0 items-center justify-center rounded-full border border-line-strong text-umber transition hover:text-ink disabled:opacity-30";

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <button type="button" onClick={() => shift(-1)} disabled={atStart} aria-label={t("calendar.prev")} className={arrowClass}>
          <ChevronLeft className="size-5" />
        </button>
        {header}
        <button type="button" onClick={() => shift(1)} aria-label={t("calendar.next")} className={arrowClass}>
          <ChevronRight className="size-5" />
        </button>
      </div>

      {!blocks && <p className="py-10 text-center text-sm text-stone">{t("calendar.loading")}</p>}
      {blocks && (
        <div
          className={cn("grid gap-8", months > 1 && "grid-cols-[repeat(auto-fit,minmax(min(260px,100%),1fr))]")}
          onMouseLeave={() => setHover(null)}
        >
          {Array.from({ length: months }, (_, i) => {
            const y = cursor.y + Math.floor((cursor.m + i) / 12);
            const m = (cursor.m + i) % 12;
            const { offset, days } = monthDays(y, m);
            return (
              <div key={`${y}-${m}`}>
                <h3 className={cn("mb-3 text-center font-serif font-medium capitalize", compact ? "text-base" : "text-lg")}>
                  {monthName(y, m)}
                </h3>
                <div className="grid grid-cols-7 gap-1 text-center text-[11px] uppercase tracking-[0.5px] text-stone" aria-hidden="true">
                  {weekdays.map((w) => (
                    <span key={w} className="py-1">
                      {w.replace(".", "")}
                    </span>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: offset }, (_, k) => (
                    <span key={`o${k}`} />
                  ))}
                  {days.map((day) => {
                    const past = day < today;
                    const bookedNight = isNightBooked(booked, day);
                    const disabled = isDisabled(day);
                    const selected = day === start || day === end;
                    // A booked day can still be chosen as the departure: the guests leave that morning.
                    const showBooked = bookedNight && !past && !(pickingDeparture && !disabled && day > start);
                    return (
                      <button
                        key={day}
                        type="button"
                        disabled={past}
                        aria-disabled={disabled}
                        onClick={() => pick(day)}
                        onMouseEnter={() => setHover(day)}
                        aria-pressed={selected}
                        aria-label={`${parseDate(day).toLocaleDateString(intlLocale[lang], { dateStyle: "full" })}${bookedNight ? ` — ${t("calendar.booked")}` : ""}`}
                        className={cn(
                          "aspect-square rounded-lg text-[13px] transition-colors",
                          past && "cursor-default text-pebble/60",
                          !past && disabled && !showBooked && "cursor-not-allowed text-pebble",
                          !disabled && !selected && !inRange(day) && "text-ink hover:bg-wheat",
                          showBooked && cn("cursor-not-allowed text-stone line-through", bookedPattern),
                          inRange(day) && !selected && "bg-moss-light text-moss",
                          selected && "bg-sage-dark font-semibold text-cream",
                        )}
                      >
                        {Number(day.slice(8))}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface Props {
  blocks: AvailabilityBlock[] | null;
  /** Called with the selected stay when the visitor clicks "Request these dates". */
  onRequest?: (arrival: string, departure: string) => void;
  months?: number;
}

export function AvailabilityCalendar({ blocks, onRequest, months = 2 }: Props) {
  const { t } = useTranslation();
  const [range, setRange] = useState<Range>({ start: null, end: null });
  const label = useRangeLabel();
  const { start, end } = range;

  return (
    <div className="rounded-[18px] border border-line bg-cream p-[clamp(16px,3vw,28px)]">
      <RangeCalendar blocks={blocks} value={range} onChange={setRange} months={months} header={<CalendarLegend />} />

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4 text-sm">
        <span className="text-umber" aria-live="polite">
          {!start && t("calendar.selectArrival")}
          {start && !end && t("calendar.selectDeparture")}
          {start && end && label(range)}
        </span>
        <div className="flex gap-3">
          {start && (
            <button
              type="button"
              onClick={() => setRange({ start: null, end: null })}
              className="text-[13px] font-semibold text-umber hover:text-ink"
            >
              {t("calendar.clear")}
            </button>
          )}
          {onRequest && (
            <Button
              type="button"
              variant="clay"
              size="pill"
              disabled={!start || !end}
              onClick={() => start && end && onRequest(start, end)}
            >
              {t("calendar.request")}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
