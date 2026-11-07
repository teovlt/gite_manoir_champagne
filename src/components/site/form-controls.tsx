import { localize, type Lang } from "@/lib/locale";
import { todayISO } from "@/lib/format";
import { isRangeFree } from "@/providers/site-data-provider";
import type { AvailabilityBlock } from "@/lib/types";
import { cn } from "@/lib/utils";

export const fieldLabelClass = "text-xs uppercase tracking-[0.5px] text-umber";
export const fieldInputClass =
  "w-full min-w-0 rounded-[14px] border border-line-strong bg-cream px-3.5 py-3 font-sans text-sm text-ink outline-none transition-shadow focus-visible:border-sage-dark focus-visible:ring-[3px] focus-visible:ring-sage/40";

interface FieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  labelClassName?: string;
}

export const Field = ({ id, label, className, labelClassName, ...props }: FieldProps) => (
  <div className="flex flex-col gap-1.5">
    <label htmlFor={id} className={cn(fieldLabelClass, labelClassName)}>
      {label}
    </label>
    <input id={id} name={id} className={cn(fieldInputClass, className)} {...props} />
  </div>
);

interface TextAreaFieldProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  id: string;
  label: string;
}

export const TextAreaField = ({ id, label, className, ...props }: TextAreaFieldProps) => (
  <div className="flex flex-col gap-1.5">
    <label htmlFor={id} className={fieldLabelClass}>
      {label}
    </label>
    <textarea id={id} name={id} className={cn(fieldInputClass, "resize-y", className)} {...props} />
  </div>
);

export interface BookingValues {
  arrivee?: string;
  depart?: string;
  adultes?: string;
  enfants?: string;
  message?: string;
}

/** Builds the /contact URL carrying the booking values, so the contact form is pre-filled. */
export function contactUrl(values: BookingValues, lang: Lang) {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([k, v]) => v && params.set(k, v));
  const qs = params.toString();
  return `${localize("/contact", lang)}${qs ? `?${qs}` : ""}#formulaire`;
}

/** Shared validation for arrival/departure/guests. Returns an i18n key, or null when valid. */
export function validateBooking(v: BookingValues, blocks?: AvailabilityBlock[] | null) {
  if (v.arrivee && v.arrivee < todayISO()) return "booking.datesPast";
  if (v.arrivee && v.depart && v.depart <= v.arrivee) return "booking.datesOrder";
  const total = Number(v.adultes || 0) + Number(v.enfants || 0);
  if (total > 14) return "booking.capacity";
  if (v.arrivee && v.depart && !isRangeFree(blocks ?? null, v.arrivee, v.depart)) return "booking.unavailable";
  return null;
}

/** API error codes → i18n keys. */
export const apiErrorKey: Record<string, string> = {
  invalid_contact: "booking.invalidContact",
  dates_order: "booking.datesOrder",
  dates_past: "booking.datesPast",
  capacity: "booking.capacity",
  unavailable: "booking.unavailable",
};
