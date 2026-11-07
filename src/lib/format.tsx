import { Fragment } from "react";

/** Renders roman-numeral centuries ("XVIIe") with a superscript "e", as in the mockups. */
export function Typo({ text }: { text: string }) {
  const parts = text.split(/\b([IVXL]+)e\b/);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <Fragment key={i}>
            {part}
            <sup>e</sup>
          </Fragment>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
}

export const lines = (text: string) =>
  text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

const euro = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 });

export const formatPrice = (value: number) => `${euro.format(value)} €`;

const dayMonth = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long" });
const dayMonthShort = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });

const parseDate = (iso: string) => new Date(`${iso}T12:00:00`);

/** "du 14 au 18 mai" / "du 30 avril au 2 mai" */
export function formatPeriod(start: string, end: string) {
  const s = parseDate(start);
  const e = parseDate(end);
  if (s.getMonth() === e.getMonth()) return `du ${s.getDate()} au ${dayMonth.format(e)}`;
  return `du ${dayMonth.format(s)} au ${dayMonth.format(e)}`;
}

/** "14 – 18 mai 2026" — compact form used in admin tables. */
export function formatPeriodShort(start: string, end: string) {
  const s = parseDate(start);
  const e = parseDate(end);
  const year = e.getFullYear();
  if (s.getMonth() === e.getMonth()) return `${s.getDate()} – ${dayMonthShort.format(e)} ${year}`;
  return `${dayMonthShort.format(s)} – ${dayMonthShort.format(e)} ${year}`;
}

const rtf = new Intl.RelativeTimeFormat("fr-FR", { numeric: "auto" });

export function formatRelative(iso: string) {
  const diffMs = new Date(iso).getTime() - Date.now();
  const minutes = Math.round(diffMs / 60000);
  if (Math.abs(minutes) < 60) return rtf.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return rtf.format(hours, "hour");
  const days = Math.round(hours / 24);
  if (Math.abs(days) < 30) return rtf.format(days, "day");
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
