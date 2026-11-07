export type PhotoSection = "accueil" | "gite" | "jardins" | "region";

export interface Photo {
  id?: number;
  key: string | null;
  section: PhotoSection;
  alt: string;
  url: string | null;
}

export interface Formula {
  id: string;
  name: string;
  duration: string;
  low: number;
  high: number;
}

export interface Season {
  id: string;
  name: string;
  periods: string;
}

export interface Extra {
  id: string;
  label: string;
  price: number;
  unit: string;
}

export interface Pricing {
  formulas: Formula[];
  seasons: Season[];
  extras: Extra[];
}

export interface NavLink {
  label: string;
  href: string;
}

export interface SiteEvent {
  id: number;
  title: string;
  startDate: string;
  endDate: string;
  text: string;
  link: string;
  active: boolean;
}

export interface ContentField {
  key: string;
  label: string;
  type: "text" | "textarea";
  value: string;
}

export interface ContentPage {
  id: string;
  label: string;
  path: string;
  sections: { title: string; fields: ContentField[] }[];
}

export type ContentValues = Record<string, Record<string, string>>;

export interface SiteData {
  content: ContentValues;
  navLinks: NavLink[];
  photos: Photo[];
  pricing: Pricing;
  banner: SiteEvent | null;
}

export interface BookingRequest {
  id: number;
  name: string;
  email: string;
  arrival: string | null;
  departure: string | null;
  dates: string | null;
  adults: number | null;
  children: number | null;
  message: string | null;
  status: "nouvelle" | "repondue";
  createdAt: string;
}

export interface ActivityEntry {
  id: number;
  userName: string;
  message: string;
  createdAt: string;
}

export interface AdminUser {
  id: number;
  email: string;
  name: string;
}
