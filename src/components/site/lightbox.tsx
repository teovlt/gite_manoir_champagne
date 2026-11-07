import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

export interface LightboxImage {
  url: string;
  alt: string;
}

interface LightboxState {
  open: (images: LightboxImage[], index: number) => void;
}

const LightboxContext = createContext<LightboxState>({ open: () => {} });
export const useLightbox = () => useContext(LightboxContext);

/** Full-screen photo viewer: arrows, keyboard (← →, Échap) and swipe. */
export function LightboxProvider({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const [images, setImages] = useState<LightboxImage[]>([]);
  const [index, setIndex] = useState<number | null>(null);
  const touchX = useRef<number | null>(null);

  const open = useCallback((imgs: LightboxImage[], i: number) => {
    setImages(imgs);
    setIndex(i);
  }, []);

  const go = useCallback((delta: number) => setIndex((i) => (i === null ? i : (i + delta + images.length) % images.length)), [images.length]);

  useEffect(() => {
    if (index === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, go]);

  const current = index !== null ? images[index] : null;
  const navBtn = "absolute top-1/2 z-10 flex size-12 -translate-y-1/2 items-center justify-center rounded-full bg-cream/15 text-cream backdrop-blur transition hover:bg-cream/30";

  return (
    <LightboxContext.Provider value={{ open }}>
      {children}
      <Dialog.Root open={index !== null} onOpenChange={(o) => !o && setIndex(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[90] bg-[#1c1b17]/92 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
          <Dialog.Content
            className="fixed inset-0 z-[91] flex items-center justify-center p-4 outline-none sm:p-12"
            onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
            onTouchEnd={(e) => {
              if (touchX.current === null) return;
              const dx = e.changedTouches[0].clientX - touchX.current;
              if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
              touchX.current = null;
            }}
          >
            <Dialog.Title className="sr-only">{current?.alt}</Dialog.Title>
            {current && (
              <figure className="flex max-h-full max-w-6xl flex-col items-center gap-3">
                <img key={current.url} src={current.url} alt={current.alt} className="max-h-[80vh] w-auto rounded-lg object-contain shadow-2xl animate-in fade-in-0 zoom-in-95 duration-300" />
                <figcaption className="text-center text-sm text-cream/85">
                  {current.alt}
                  {images.length > 1 && <span className="ml-3 text-cream/55">{t("lightbox.counter", { index: index! + 1, total: images.length })}</span>}
                </figcaption>
              </figure>
            )}
            {images.length > 1 && (
              <>
                <button type="button" onClick={() => go(-1)} className={cn(navBtn, "left-3 sm:left-6")} aria-label={t("lightbox.prev")}>
                  <ChevronLeft className="size-6" />
                </button>
                <button type="button" onClick={() => go(1)} className={cn(navBtn, "right-3 sm:right-6")} aria-label={t("lightbox.next")}>
                  <ChevronRight className="size-6" />
                </button>
              </>
            )}
            <Dialog.Close className="absolute right-4 top-4 flex size-11 items-center justify-center rounded-full bg-cream/15 text-cream hover:bg-cream/30" aria-label={t("lightbox.close")}>
              <X className="size-5" />
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </LightboxContext.Provider>
  );
}
