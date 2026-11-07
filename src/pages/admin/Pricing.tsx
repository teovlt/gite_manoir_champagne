import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AdminCard, AdminH2, adminInputClass } from "@/components/admin/admin-ui";
import { useSiteData } from "@/providers/site-data-provider";
import { api } from "@/lib/api";
import type { Pricing } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Pricing form keeps raw strings so owners can type "1 360" or "12,50". */
type Editable = {
  formulas: { id: string; name: string; duration: string; low: string; high: string }[];
  seasons: { id: string; name: string; periods: string }[];
  extras: { id: string; label: string; unit: string; price: string }[];
};

const toEditable = (p: Pricing): Editable => ({
  formulas: p.formulas.map((f) => ({ ...f, low: String(f.low), high: String(f.high) })),
  seasons: p.seasons.map((s) => ({ ...s })),
  extras: p.extras.map((x) => ({ ...x, price: String(x.price) })),
});

const priceInput = cn(adminInputClass, "w-[96px] rounded-[10px] px-2.5 py-2 text-right");
const isPrice = (v: string) => /^\d[\d\s]*([.,]\d{1,2})?$/.test(v.trim());

export function AdminPricing() {
  const { data, refresh } = useSiteData();
  const [form, setForm] = useState<Editable>(() => toEditable(data.pricing));
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .get<Pricing>("/api/admin/pricing")
      .then((p) => setForm(toEditable(p)))
      .catch((e) => toast.error(e.message));
  }, []);

  const update = <K extends keyof Editable>(list: K, id: string, patch: Partial<Editable[K][number]>) => {
    setForm((f) => ({ ...f, [list]: (f[list] as Editable[K][number][]).map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
    setDirty(true);
  };

  const invalid = [...form.formulas.flatMap((f) => [f.low, f.high]), ...form.extras.map((x) => x.price)].some((v) => !isPrice(v));

  const save = async () => {
    setSaving(true);
    try {
      const saved = await api.put<Pricing>("/api/admin/pricing", form);
      setForm(toEditable(saved));
      setDirty(false);
      await refresh();
      toast.success("Tarifs enregistrés — la page Tarifs est à jour.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <AdminH2 className="mb-4">Grille tarifaire</AdminH2>
      <AdminCard className="mb-8 overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-left text-sm">
          <thead>
            <tr className="bg-wheat">
              <th className="px-5 py-3.5 font-semibold">Formule</th>
              <th className="px-5 py-3.5 font-semibold">Durée</th>
              <th className="px-5 py-3.5 font-semibold">Prix bas</th>
              <th className="px-5 py-3.5 font-semibold">Prix haut</th>
            </tr>
          </thead>
          <tbody>
            {form.formulas.map((f) => (
              <tr key={f.id} className="border-t border-line">
                <td className="px-5 py-3 font-semibold">{f.name}</td>
                <td className="px-5 py-3 text-ink-soft">{f.duration}</td>
                {(["low", "high"] as const).map((k) => (
                  <td key={k} className="px-5 py-3">
                    <input
                      aria-label={`${f.name} — ${k === "low" ? "prix bas" : "prix haut"}`}
                      inputMode="decimal"
                      value={f[k]}
                      onChange={(e) => update("formulas", f.id, { [k]: e.target.value })}
                      className={cn(priceInput, !isPrice(f[k]) && "border-clay")}
                    />{" "}
                    €
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </AdminCard>

      <AdminH2 className="mb-4">Périodes de saison</AdminH2>
      <div className="mb-8 grid grid-cols-[repeat(auto-fit,minmax(min(280px,100%),1fr))] gap-4">
        {form.seasons.map((s) => (
          <AdminCard key={s.id} className="flex flex-col gap-2 p-[18px]">
            <label htmlFor={`season-${s.id}`} className="text-xs font-semibold uppercase tracking-[0.5px] text-clay">
              {s.name}
            </label>
            <input id={`season-${s.id}`} value={s.periods} onChange={(e) => update("seasons", s.id, { periods: e.target.value })} className={adminInputClass} />
          </AdminCard>
        ))}
      </div>

      <AdminH2 className="mb-4">Suppléments &amp; options</AdminH2>
      <AdminCard className="mb-8 px-5 py-1.5">
        {form.extras.map((x, i) => (
          <div key={x.id} className={cn("flex items-center justify-between gap-4 py-3", i < form.extras.length - 1 && "border-b border-line")}>
            <label htmlFor={`extra-${x.id}`} className="text-sm text-ink-soft">
              {x.label}
              {x.unit && <span className="text-stone"> ({x.unit.replace(/^\/\s*/, "par ")})</span>}
            </label>
            <span className="whitespace-nowrap text-sm">
              <input
                id={`extra-${x.id}`}
                inputMode="decimal"
                value={x.price}
                onChange={(e) => update("extras", x.id, { price: e.target.value })}
                className={cn(priceInput, !isPrice(x.price) && "border-clay")}
              />{" "}
              €
            </span>
          </div>
        ))}
      </AdminCard>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="clay" size="pillMd" className="px-8" disabled={!dirty || invalid || saving} onClick={save}>
          {saving ? "Enregistrement…" : "Enregistrer les tarifs"}
        </Button>
        {invalid && <span className="text-[12.5px] text-clay">Vérifiez les montants surlignés (nombres uniquement).</span>}
      </div>
    </>
  );
}
