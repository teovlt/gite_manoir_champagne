import type { Translated } from "./locale";

export type PhotoSection = "accueil" | "gite" | "jardins" | "region";

export interface Photo {
  id?: string;
  key: string | null;
  section: PhotoSection;
  alt: Translated;
  url: string | null;
}

export interface Formula {
  id: string;
  name: Translated;
  duration: Translated;
  low: number;
  high: number;
}

export interface Season {
  id: string;
  name: Translated;
  periods: Translated;
}

export interface Extra {
  id: string;
  label: Translated;
  price: number;
  unit: Translated;
}

export interface Pricing {
  formulas: Formula[];
  seasons: Season[];
  extras: Extra[];
}

export interface NavLink {
  label: Translated;
  href: string;
}

export interface SiteEvent {
  id: string;
  title: Translated;
  startDate: string;
  endDate: string;
  text: Translated;
  link: string;
  active: boolean;
}

export interface ContentField {
  key: string;
  label: string;
  type: "text" | "textarea";
  value: Translated;
}

export interface ContentPage {
  id: string;
  label: string;
  path: string;
  sections: { title: string; fields: ContentField[] }[];
}

/** page → key → value, for one language */
export type PageValues = Record<string, Record<string, string>>;
/** lang → page → key → value */
export type ContentValues = Record<string, PageValues>;

export interface SiteSettings {
  phone: string;
  address: string;
  abritelUrl: string;
  location: { lat: number; lng: number; zoom: number };
}

export interface SiteData {
  content: ContentValues;
  navLinks: NavLink[];
  photos: Photo[];
  pricing: Pricing;
  banner: SiteEvent | null;
  settings: SiteSettings;
}

export type RequestStatus = "nouvelle" | "repondue" | "confirmee" | "refusee";

export interface BookingRequest {
  id: string;
  /** Missing on requests sent before questions existed: those are bookings. */
  kind?: "booking" | "question";
  name: string;
  email: string;
  arrival: string | null;
  departure: string | null;
  dates: string | null;
  adults: number | null;
  children: number | null;
  message: string | null;
  lang: string;
  note?: string;
  status: RequestStatus;
  blockId?: string | null;
  createdAt: string;
}

export interface ActivityEntry {
  id: string;
  userName: string;
  message: string;
  createdAt: string;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: "admin" | "editor";
  createdAt: string;
  lastLoginAt: string | null;
  pending: boolean;
  /** New address waiting for confirmation through the link sent to it. */
  pendingEmail: string | null;
}

export type MailLang = "fr" | "en" | "de";

export interface MailTemplate {
  id: string;
  label: string;
  description: string;
  audience: string;
  langs: MailLang[];
  variables: { key: string; label: string }[];
  sample: Record<string, string>;
  defaults: Partial<Record<MailLang, { subject: string; body: string }>>;
  custom: Partial<Record<MailLang, { subject: string; body: string }>>;
}

/** A platform booking overlapping a stay of the site or a hand-blocked period. */
export interface CalendarConflict {
  key: string;
  /** Same dates on both sides: often just the platform re-exporting the site's own dates. */
  exact: boolean;
  local: { id: string; start: string; end: string; label: string; source: "manual" | "request" };
  external: { start: string; end: string; label: string; platform: string };
}

export interface AvailabilityBlock {
  id?: string;
  start: string;
  end: string;
  label?: string;
  source?: "manual" | "ical" | "request";
  feed?: string | null;
}
