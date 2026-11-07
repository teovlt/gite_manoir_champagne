import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import contentSchema from "@shared/content.json";
import defaultPhotos from "@shared/photos.json";
import defaultPricing from "@shared/pricing.json";
import { api } from "@/lib/api";
import type { ContentPage, ContentValues, Photo, SiteData } from "@/lib/types";

export const contentPages = contentSchema.pages as ContentPage[];

/** Default values baked in the bundle — used while the API loads, or if it is unreachable. */
const defaultContent: ContentValues = Object.fromEntries(
  contentPages.map((page) => [page.id, Object.fromEntries(page.sections.flatMap((s) => s.fields.map((f) => [f.key, f.value])))]),
);

const fallback: SiteData = {
  content: defaultContent,
  navLinks: contentSchema.navLinks,
  photos: defaultPhotos as Photo[],
  pricing: defaultPricing,
  banner: null,
};

interface SiteDataState {
  data: SiteData;
  refresh: () => Promise<void>;
}

const SiteDataContext = createContext<SiteDataState>({ data: fallback, refresh: async () => {} });

export function SiteDataProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<SiteData>(fallback);

  const refresh = useCallback(async () => {
    try {
      const remote = await api.get<SiteData>("/api/site");
      setData({
        ...remote,
        // Keep defaults for any key the database does not know yet.
        content: Object.fromEntries(
          Object.entries(defaultContent).map(([page, values]) => [page, { ...values, ...(remote.content[page] ?? {}) }]),
        ),
      });
    } catch {
      // API unreachable: keep rendering bundled defaults.
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = useMemo(() => ({ data, refresh }), [data, refresh]);
  return <SiteDataContext.Provider value={value}>{children}</SiteDataContext.Provider>;
}

export const useSiteData = () => useContext(SiteDataContext);

/** Returns a getter for the editable texts of a page. */
export function usePageText(page: string) {
  const { data } = useSiteData();
  return (key: string) => data.content[page]?.[key] ?? "";
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
