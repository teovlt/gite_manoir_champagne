import { Fragment } from "react";
import { intlLocale, type Lang } from "./locale";

/** Renders centuries with a superscript: "XVIIe" (fr), "17th" (en), "17." stays as is. */
export function Typo({ text }: { text: string }) {
  const parts = text.split(/\b([IVX]+|[IVXL]{2,})(e)\b|\b(\d{1,2})(st|nd|rd|th)\b/);
  const out: React.ReactNode[] = [];
  for (let i = 0; i < parts.length; i += 5) {
    out.push(<Fragment key={i}>{parts[i]}</Fragment>);
    if (parts[i + 1]) out.push(<Fragment key={`${i}r`}>{parts[i + 1]}<sup>{parts[i + 2]}</sup></Fragment>);
    if (parts[i + 3]) out.push(<Fragment key={`${i}n`}>{parts[i + 3]}<sup>{parts[i + 4]}</sup></Fragment>);
  }
  return <>{out}</>;
}

export const lines = (text: string) =>
  text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

/** Whole euros stay whole ("130 €"), cents always show two digits ("1,10 €"). */
export const formatPrice = (value: number, lang: Lang = "fr") => {
  const digits = Number.isInteger(value) ? 0 : 2;
  const opts = { minimumFractionDigits: digits, maximumFractionDigits: digits };
  return lang === "en"
    ? `€${new Intl.NumberFormat("en-GB", opts).format(value)}`
    : `${new Intl.NumberFormat(intlLocale[lang], opts).format(value)} €`;
};

export const parseDate = (iso: string) => new Date(`${iso}T12:00:00`);

export const formatDay = (iso: string, lang: Lang = "fr", withYear = false) =>
  parseDate(iso).toLocaleDateString(intlLocale[lang], { day: "numeric", month: "long", ...(withYear ? { year: "numeric" } : {}) });

/** "14 – 18 mai 2026" — compact form used in admin tables. */
export function formatPeriodShort(start: string, end: string) {
  const s = parseDate(start);
  const e = parseDate(end);
  const short = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });
  if (s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()) return `${s.getDate()} – ${short.format(e)} ${e.getFullYear()}`;
  return `${short.format(s)} – ${short.format(e)} ${e.getFullYear()}`;
}

export const toISODate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const todayISO = () => toISODate(new Date());

export const addDays = (iso: string, days: number) => {
  const d = parseDate(iso);
  d.setDate(d.getDate() + days);
  return toISODate(d);
};

export const nightsBetween = (start: string, end: string) => Math.round((parseDate(end).getTime() - parseDate(start).getTime()) / 86400000);

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
