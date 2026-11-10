import { createContext, useCallback, useContext, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import { adminSecondaryButtonClass } from "./admin-ui";

interface ConfirmOptions {
  title: string;
  message?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Red-ish confirm button for deletions and other irreversible actions. */
  danger?: boolean;
}

type Confirm = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<Confirm | null>(null);

/** Styled replacement for window.confirm: `if (!(await confirm({ title }))) return;` */
export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<(ok: boolean) => void>(undefined);

  const confirm = useCallback<Confirm>(
    (opts) =>
      new Promise<boolean>((resolve) => {
        resolver.current?.(false);
        resolver.current = resolve;
        setOptions(opts);
      }),
    [],
  );

  const close = (ok: boolean) => {
    resolver.current?.(ok);
    resolver.current = undefined;
    setOptions(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Dialog.Root open={Boolean(options)} onOpenChange={(open) => !open && close(false)}>
        <Dialog.Portal>
          <Dialog.Overlay className="data-[state=open]:animate-in data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-ink/45" />
          <Dialog.Content
            className="data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 fixed left-1/2 top-1/2 z-50 w-[min(520px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 rounded-[20px] border border-line-strong bg-cream p-6 text-ink shadow-[0_24px_60px_rgba(43,42,37,0.22)] [--color-stone:#6b6552]"
            onOpenAutoFocus={(e) => {
              // Focus the safe choice first.
              e.preventDefault();
              (e.currentTarget as HTMLElement).querySelector<HTMLButtonElement>("[data-cancel]")?.focus();
            }}
          >
            <Dialog.Title className="font-serif text-xl font-medium">{options?.title}</Dialog.Title>
            {options?.message ? (
              <Dialog.Description className="mt-2.5 text-[14px] leading-relaxed text-ink-soft">{options.message}</Dialog.Description>
            ) : (
              <Dialog.Description className="sr-only">{options?.title}</Dialog.Description>
            )}
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button type="button" data-cancel onClick={() => close(false)} className={adminSecondaryButtonClass}>
                {options?.cancelLabel ?? "Annuler"}
              </button>
              <Button
                type="button"
                variant="clay"
                size="pill"
                onClick={() => close(true)}
                className={options?.danger ? "bg-[#9C4325] hover:bg-[#843719]" : undefined}
              >
                {options?.confirmLabel ?? "Confirmer"}
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within a ConfirmProvider");
  return ctx;
}
