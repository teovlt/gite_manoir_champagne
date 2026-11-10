import { cn } from "@/lib/utils";

export const adminInputClass =
  "w-full rounded-[14px] border border-line-strong bg-cream px-3.5 py-3 font-sans text-sm text-ink outline-none placeholder:text-[#B9B199] focus-visible:border-sage-dark focus-visible:ring-[3px] focus-visible:ring-sage/40 disabled:opacity-60";

/** Secondary rounded button (outline), next to the clay primary one. */
export const adminSecondaryButtonClass =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full border border-line-strong bg-cream px-[22px] py-[11px] text-[13px] font-semibold text-umber transition-colors hover:border-khaki hover:text-ink disabled:pointer-events-none disabled:opacity-50";

export const AdminLabel = ({ htmlFor, children }: { htmlFor?: string; children: React.ReactNode }) => (
  <label htmlFor={htmlFor} className="text-xs uppercase tracking-[0.5px] text-umber">
    {children}
  </label>
);

export const AdminCard = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <div className={cn("rounded-2xl border border-line-strong bg-cream", className)}>{children}</div>
);

export const AdminH2 = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <h2 className={cn("font-serif text-lg font-medium text-ink", className)}>{children}</h2>
);

interface PillTabsProps<T extends string> {
  items: { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
  label: string;
  className?: string;
}

/** Rounded filter chips used by "Contenu des pages" and "Photos & médias". */
export function PillTabs<T extends string>({ items, value, onChange, label, className }: PillTabsProps<T>) {
  return (
    <div role="tablist" aria-label={label} className={cn("flex flex-wrap gap-2.5 pb-1", className)}>
      {items.map((item) => {
        const active = item.id === value;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.id)}
            className={cn(
              "whitespace-nowrap rounded-full px-4 py-[9px] text-[13px] font-semibold transition-colors",
              active ? "bg-ink text-cream" : "border border-line-strong bg-cream text-umber hover:border-khaki hover:text-ink",
            )}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

export const StatusBadge = ({ tone, children, className }: { tone: "sage" | "wheat" | "muted"; children: React.ReactNode; className?: string }) => (
  <span
    className={cn(
      "inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.3px]",
      tone === "sage" && "bg-moss-light text-moss",
      tone === "wheat" && "bg-wheat text-rust",
      tone === "muted" && "bg-line text-stone",
      className,
    )}
  >
    {children}
  </span>
);

export function Toggle({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-block h-[26px] w-[46px] shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-sage/50",
        checked ? "bg-sage-dark" : "bg-khaki",
      )}
    >
      <span className={cn("absolute top-[3px] size-5 rounded-full bg-cream transition-all", checked ? "left-[23px]" : "left-[3px]")} />
    </button>
  );
}

export const InfoNote = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-center gap-2.5 rounded-xl bg-wheat px-4 py-3 text-[13px] text-[#6B5A3E]">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#BE6A45" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v5M12 16h.01" />
    </svg>
    <span>{children}</span>
  </div>
);

/** Icon set from the admin mockups (stroke icons). */
export const AdminIcon = {
  dashboard: (
    <>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </>
  ),
  content: (
    <>
      <path d="M4 4h16v4H4z" />
      <path d="M4 11h10M4 15h10M4 19h6" />
    </>
  ),
  photos: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="9" cy="11" r="2" />
      <path d="M21 17l-5.5-5.5a2 2 0 0 0-2.8 0L5 19" />
    </>
  ),
  banner: (
    <>
      <path d="M3 10a9 9 0 0 1 18 0v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <path d="M8 14h8M8 10h8" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <path d="M3 9h18M8 2v4M16 2v4" />
    </>
  ),
  pricing: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9 9h.01M15 15h.01M15 9l-6 6" />
    </>
  ),
  home: (
    <>
      <path d="M3 11l9-7 9 7" />
      <path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" />
    </>
  ),
  logout: (
    <>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </>
  ),
  bell: (
    <>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </>
  ),
  edit: <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z" />,
  trash: <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6z" />,
  upload: (
    <>
      <path d="M12 3v12" />
      <path d="M7 8l5-5 5 5" />
      <path d="M4 21h16" />
    </>
  ),
  inbox: (
    <>
      <path d="M22 12h-6l-2 3h-4l-2-3H2" />
      <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="10" r="3" />
      <path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
      <path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6" />
    </>
  ),
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 6 9-6" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
};

export const Icon = ({ name, size = 18, strokeWidth = 1.6, className }: { name: keyof typeof AdminIcon; size?: number; strokeWidth?: number; className?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    {AdminIcon[name]}
  </svg>
);

const langNames = { fr: "Français", en: "English", de: "Deutsch" } as const;
export type AdminLang = keyof typeof langNames;

/** FR / EN / DE switch for translatable fields. */
export function LangSwitch({ value, onChange, className }: { value: AdminLang; onChange: (l: AdminLang) => void; className?: string }) {
  return (
    <div role="tablist" aria-label="Langue du contenu" className={cn("inline-flex rounded-full border border-line-strong bg-cream p-1", className)}>
      {(Object.keys(langNames) as AdminLang[]).map((l) => (
        <button
          key={l}
          type="button"
          role="tab"
          aria-selected={value === l}
          title={langNames[l]}
          onClick={() => onChange(l)}
          className={cn(
            "rounded-full px-3.5 py-1.5 text-xs font-bold uppercase tracking-[0.5px] transition-colors",
            value === l ? "bg-sage-dark text-cream" : "text-umber hover:text-ink",
          )}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

export const LANG_FLAGS: Record<AdminLang, string> = { fr: "FR", en: "EN", de: "DE" };
