import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { intlLocale, useLang } from "@/lib/locale";
import { addDays, nightsBetween, toISODate, todayISO } from "@/lib/format";
import type { AvailabilityBlock } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  blocks: AvailabilityBlock[] | null;
  /** Called with the selected stay when the visitor clicks "Request these dates". */
  onRequest?: (arrival: string, departure: string) => void;
  months?: number;
}

/** A night is booked when some block covers it: block.start <= night < block.end. */
const isNightBooked = (blocks: AvailabilityBlock[], day: string) => blocks.some((b) => b.start <= day && day < b.end);

function monthDays(year: number, month: number) {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7; // Monday first
  const count = new Date(year, month + 1, 0).getDate();
  return { offset, days: Array.from({ length: count }, (_, i) => toISODate(new Date(year, month, i + 1))) };
}

export function AvailabilityCalendar({ blocks, onRequest, months = 2 }: Props) {
  const { t } = useTranslation();
  const lang = useLang();
  const today = todayISO();
  const now = new Date();
  const [cursor, setCursor] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [start, setStart] = useState<string | null>(null);
  const [end, setEnd] = useState<string | null>(null);
  const booked = blocks ?? [];

  const weekdays = useMemo(() => {
    const f = new Intl.DateTimeFormat(intlLocale[lang], { weekday: "short" });
    return Array.from({ length: 7 }, (_, i) => f.format(new Date(2024, 0, 1 + i))); // 2024-01-01 is a Monday
  }, [lang]);
  const monthName = (y: number, m: number) => new Intl.DateTimeFormat(intlLocale[lang], { month: "long", year: "numeric" }).format(new Date(y, m, 1));

  const shift = (delta: number) => setCursor(({ y, m }) => ({ y: y + Math.floor((m + delta) / 12), m: (((m + delta) % 12) + 12) % 12 }));
  const atStart = cursor.y === now.getFullYear() && cursor.m === now.getMonth();

  const pick = (day: string) => {
    if (!start || end || day <= start) {
      if (isNightBooked(booked, day)) return;
      setStart(day);
      setEnd(null);
      return;
    }
    // Departure: every night between start and day must be free.
    for (let d = start; d < day; d = addDays(d, 1)) if (isNightBooked(booked, d)) return setStart(isNightBooked(booked, day) ? null : day);
    setEnd(day);
  };

  const inRange = (day: string) => start && end && day >= start && day <= end;

  return (
    <div className="rounded-[18px] border border-line bg-cream p-[clamp(16px,3vw,28px)]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <button type="button" onClick={() => shift(-1)} disabled={atStart} aria-label={t("calendar.prev")} className="flex size-10 items-center justify-center rounded-full border border-line-strong text-umber transition hover:text-ink disabled:opacity-30">
          <ChevronLeft className="size-5" />
        </button>
        <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-umber">
          <span className="flex items-center gap-1.5">
            <span className="size-3 rounded-sm border border-line-strong bg-cream" /> {t("calendar.free")}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-3 rounded-sm bg-[repeating-linear-gradient(135deg,#EADFC2_0_3px,#F6EEDC_3px_6px)]" /> {t("calendar.booked")}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-3 rounded-sm bg-sage-dark" /> {t("calendar.selected")}
          </span>
        </div>
        <button type="button" onClick={() => shift(1)} aria-label={t("calendar.next")} className="flex size-10 items-center justify-center rounded-full border border-line-strong text-umber transition hover:text-ink">
          <ChevronRight className="size-5" />
        </button>
      </div>

      {!blocks && <p className="py-10 text-center text-sm text-stone">{t("calendar.loading")}</p>}
      {blocks && (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(260px,100%),1fr))] gap-8">
          {Array.from({ length: months }, (_, i) => {
            const y = cursor.y + Math.floor((cursor.m + i) / 12);
            const m = (cursor.m + i) % 12;
            const { offset, days } = monthDays(y, m);
            return (
              <div key={`${y}-${m}`}>
                <h3 className="mb-3 text-center font-serif text-lg font-medium capitalize">{monthName(y, m)}</h3>
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
                    const selected = day === start || day === end;
                    return (
                      <button
                        key={day}
                        type="button"
                        disabled={past}
                        onClick={() => pick(day)}
                        aria-pressed={selected}
                        aria-label={`${new Date(`${day}T12:00:00`).toLocaleDateString(intlLocale[lang], { dateStyle: "full" })}${bookedNight ? ` — ${t("calendar.booked")}` : ""}`}
                        className={cn(
                          "aspect-square rounded-lg text-[13px] transition-colors",
                          past && "cursor-default text-pebble/60",
                          !past && !bookedNight && !inRange(day) && "text-ink hover:bg-wheat",
                          bookedNight && !past && "cursor-not-allowed bg-[repeating-linear-gradient(135deg,#EADFC2_0_3px,#F6EEDC_3px_6px)] text-stone line-through",
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

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4 text-sm">
        <span className="text-umber" aria-live="polite">
          {!start && t("calendar.selectArrival")}
          {start && !end && t("calendar.selectDeparture")}
          {start && end && (
            <>
              {t("booking.datesFrom", {
                start: new Date(`${start}T12:00:00`).toLocaleDateString(intlLocale[lang], { day: "numeric", month: "long" }),
                end: new Date(`${end}T12:00:00`).toLocaleDateString(intlLocale[lang], { day: "numeric", month: "long", year: "numeric" }),
              })}{" "}
              · {t("calendar.nights", { count: nightsBetween(start, end) })}
            </>
          )}
        </span>
        <div className="flex gap-3">
          {start && (
            <button
              type="button"
              onClick={() => {
                setStart(null);
                setEnd(null);
              }}
              className="text-[13px] font-semibold text-umber hover:text-ink"
            >
              {t("calendar.clear")}
            </button>
          )}
          {onRequest && (
            <Button type="button" variant="clay" size="pill" disabled={!start || !end} onClick={() => start && end && onRequest(start, end)}>
              {t("calendar.request")}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
