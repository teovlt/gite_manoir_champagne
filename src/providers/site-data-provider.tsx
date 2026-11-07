import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import contentSchema from "@shared/content.json";
import defaultPhotos from "@shared/photos.json";
import defaultPricing from "@shared/pricing.json";
import { api } from "@/lib/api";
import { LANGS, useLang, type Lang } from "@/lib/locale";
import type { AvailabilityBlock, ContentPage, ContentValues, NavLink, Photo, Pricing, SiteData, SiteSettings } from "@/lib/types";

export const contentPages = contentSchema.pages as ContentPage[];

/** Default texts baked in the bundle, per language — used while the API loads, or as fallback. */
export const defaultContent: ContentValues = Object.fromEntries(
  LANGS.map((lang) => [
    lang,
    Object.fromEntries(contentPages.map((page) => [page.id, Object.fromEntries(page.sections.flatMap((s) => s.fields.map((f) => [f.key, f.value[lang]])))])),
  ]),
);

const fallback: SiteData = {
  content: { fr: {}, en: {}, de: {} },
  navLinks: contentSchema.navLinks as NavLink[],
  photos: defaultPhotos as Photo[],
  pricing: defaultPricing as Pricing,
  banner: null,
  settings: contentSchema.settings as SiteSettings,
};

interface SiteDataState {
  data: SiteData;
  loaded: boolean;
  refresh: () => Promise<void>;
}

const SiteDataContext = createContext<SiteDataState>({ data: fallback, loaded: false, refresh: async () => {} });

export function SiteDataProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<SiteData>(fallback);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setData(await api.get<SiteData>("/api/site"));
    } catch {
      // API unreachable: keep rendering bundled defaults.
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = useMemo(() => ({ data, loaded, refresh }), [data, loaded, refresh]);
  return <SiteDataContext.Provider value={value}>{children}</SiteDataContext.Provider>;
}

export const useSiteData = () => useContext(SiteDataContext);

/** Resolves an editable text: owner's text in this language → default in this language → French. */
export function resolveText(content: ContentValues, lang: Lang, page: string, key: string) {
  return content[lang]?.[page]?.[key] || defaultContent[lang]?.[page]?.[key] || content.fr?.[page]?.[key] || defaultContent.fr[page]?.[key] || "";
}

/** Returns a getter for the editable texts of a page, in the current language. */
export function usePageText(page: string) {
  const { data } = useSiteData();
  const lang = useLang();
  return (key: string) => resolveText(data.content, lang, page, key);
}

export function usePhoto(key: string): Photo | undefined {
  const { data } = useSiteData();
  return data.photos.find((p) => p.key === key);
}

/** Free photos (uploaded without a fixed slot) for a section. */
export function useExtraPhotos(section: Photo["section"]) {
  const { data } = useSiteData();
  return data.photos.filter((p) => p.key === null && p.section === section && p.url);
}

let availabilityCache: Promise<AvailabilityBlock[]> | null = null;

/** Booked periods [start, end) — end is the check-out day. */
export function useAvailability() {
  const [blocks, setBlocks] = useState<AvailabilityBlock[] | null>(null);
  useEffect(() => {
    availabilityCache ??= api
      .get<{ blocks: AvailabilityBlock[] }>("/api/availability")
      .then((r) => r.blocks)
      .catch(() => {
        availabilityCache = null;
        return [];
      });
    let alive = true;
    availabilityCache.then((b) => alive && setBlocks(b));
    return () => {
      alive = false;
    };
  }, []);
  return blocks;
}

export const isRangeFree = (blocks: AvailabilityBlock[] | null, start: string, end: string) =>
  !blocks || !start || !end || !blocks.some((b) => b.start < end && b.end > start);
