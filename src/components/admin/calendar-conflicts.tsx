import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { formatPeriodShort } from "@/lib/format";
import type { CalendarConflict } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Platform bookings overlapping a stay of the site: a probable double booking.
 * On the calendar page each one can be marked as checked; the dashboard only links there.
 */
export function CalendarConflicts({ conflicts, onChange }: { conflicts: CalendarConflict[]; onChange?: () => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  if (!conflicts.length) return null;
  const real = conflicts.filter((c) => !c.exact).length;

  const ignore = async (c: CalendarConflict) => {
    setBusy(c.key);
    try {
      await api.post("/api/admin/availability/conflicts/ignore", { key: c.key });
      toast.success("Chevauchement marqué comme vérifié.");
      onChange?.();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <section
      role="alert"
      className={cn(
        "mb-7 rounded-2xl border p-5",
        real ? "border-clay bg-[#F6E3D9] text-[#6B2E18]" : "border-line-strong bg-wheat text-[#6B5A3E]",
      )}
    >
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="font-serif text-[18px] font-medium">
          {real ? `⚠ ${real > 1 ? `${real} doubles réservations possibles` : "Double réservation possible"}` : "Dates à vérifier"}
        </h2>
        {!onChange && (
          <Link to="/admin/calendrier" className="text-[13px] font-semibold text-clay">
            Voir le calendrier →
          </Link>
        )}
      </div>
      <ul className="flex flex-col gap-2.5 text-[13.5px]">
        {conflicts.map((c) => (
          <li key={c.key} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 rounded-xl bg-cream/70 px-3.5 py-2.5">
            <span>
              <strong>{c.external.platform}</strong> réserve {formatPeriodShort(c.external.start, c.external.end)}, qui chevauche «&nbsp;
              {c.local.label}&nbsp;» ({formatPeriodShort(c.local.start, c.local.end)}).
              {c.exact && <span className="text-stone"> Mêmes dates : sans doute la plateforme qui reprend le calendrier du site.</span>}
            </span>
            {onChange && (
              <button
                type="button"
                disabled={busy === c.key}
                onClick={() => ignore(c)}
                className="rounded-full border border-line-strong bg-cream px-3 py-1 text-[13px] font-semibold text-umber hover:text-ink disabled:opacity-50"
              >
                C'est vérifié
              </button>
            )}
          </li>
        ))}
      </ul>
      {onChange && (
        <p className="mt-3 text-[13px] leading-relaxed opacity-80">
          Réglez la situation sur la plateforme concernée (annulation, déplacement). L'alerte disparaît d'elle-même quand les dates ne se
          chevauchent plus, ou marquez-la comme vérifiée.
        </p>
      )}
    </section>
  );
}
