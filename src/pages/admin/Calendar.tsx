import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AdminCard, AdminH2, AdminLabel, Icon, StatusBadge, adminInputClass } from "@/components/admin/admin-ui";
import { api } from "@/lib/api";
import { formatPeriodShort, formatRelative, nightsBetween, todayISO } from "@/lib/format";
import type { AvailabilityBlock } from "@/lib/types";
import { cn } from "@/lib/utils";

type SyncReport = { url: string; ok: boolean; count?: number; error?: string }[];

interface CalendarData {
  blocks: AvailabilityBlock[];
  icalUrls: string[];
  lastSync: { at: string; report: SyncReport } | null;
  exportUrl: string;
}

const sourceLabel = { manual: "Manuel", ical: "Calendrier externe", request: "Demande confirmée" } as const;

/** Month strip showing which nights are booked, to see the year at a glance. */
function YearOverview({ blocks }: { blocks: AvailabilityBlock[] }) {
  const start = new Date();
  start.setDate(1);
  const months = Array.from({ length: 12 }, (_, i) => new Date(start.getFullYear(), start.getMonth() + i, 1));
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-4">
      {months.map((m) => {
        const days = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
        const offset = (m.getDay() + 6) % 7;
        return (
          <div key={m.toISOString()}>
            <p className="mb-1.5 text-xs font-semibold capitalize text-umber">
              {m.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
            </p>
            <div className="grid grid-cols-7 gap-[3px]">
              {Array.from({ length: offset }, (_, k) => (
                <span key={k} />
              ))}
              {Array.from({ length: days }, (_, k) => {
                const day = iso(new Date(m.getFullYear(), m.getMonth(), k + 1));
                const b = blocks.find((x) => x.start <= day && day < x.end);
                return (
                  <span
                    key={day}
                    title={b ? `${day} — ${b.label}` : day}
                    className={cn(
                      "aspect-square rounded-[3px]",
                      !b && "bg-line",
                      b?.source === "ical" && "bg-[#C9A36A]",
                      b?.source === "request" && "bg-sage-dark",
                      b?.source === "manual" && "bg-clay",
                    )}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function AdminCalendar() {
  const [data, setData] = useState<CalendarData | null>(null);
  const [draft, setDraft] = useState({ start: "", end: "", label: "" });
  const [urls, setUrls] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await api.get<CalendarData>("/api/admin/availability");
    setData(res);
    setUrls(res.icalUrls.length ? res.icalUrls : [""]);
  }, []);
  useEffect(() => {
    load().catch((e) => toast.error(e.message));
  }, [load]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/api/admin/availability", draft);
      toast.success("Période bloquée — elle apparaît déjà sur le site.");
      setDraft({ start: "", end: "", label: "" });
      load();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const remove = async (b: AvailabilityBlock) => {
    if (!window.confirm(`Libérer la période « ${b.label} » (${formatPeriodShort(b.start, b.end)}) ?`)) return;
    try {
      await api.delete(`/api/admin/availability/${b.id}`);
      toast.success("Période libérée.");
      load();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const saveFeeds = async () => {
    setSaving(true);
    try {
      const res = await api.put<{ report: SyncReport }>("/api/admin/availability/ical", { urls: urls.filter(Boolean) });
      const failed = res.report.filter((r) => !r.ok);
      if (failed.length) toast.error(`Synchronisation impossible : ${failed.map((f) => f.error).join(", ")}`);
      else toast.success("Calendriers synchronisés.");
      load();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const sync = async () => {
    setSaving(true);
    try {
      const res = await api.post<{ report: SyncReport }>("/api/admin/availability/sync");
      const failed = res.report.filter((r) => !r.ok);
      if (failed.length) toast.error(`Synchronisation incomplète : ${failed.map((f) => f.error).join(", ")}`);
      else toast.success("Synchronisation terminée.");
      load();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const copyExport = async () => {
    if (!data) return;
    try {
      await navigator.clipboard.writeText(data.exportUrl);
      toast.success("Lien copié.");
    } catch {
      toast.error("Copie impossible : sélectionnez le lien et copiez-le à la main.");
    }
  };

  const renewExport = async () => {
    if (!window.confirm("Créer un nouveau lien ? L'ancien cessera de fonctionner : il faudra coller le nouveau sur chaque plateforme."))
      return;
    try {
      const res = await api.post<{ exportUrl: string }>("/api/admin/availability/export-link");
      setData((d) => (d ? { ...d, exportUrl: res.exportUrl } : d));
      toast.success("Nouveau lien créé.");
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const upcoming = data?.blocks.filter((b) => b.end > todayISO()) ?? [];

  return (
    <>
      <AdminCard className="mb-7 p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <AdminH2>Les 12 prochains mois</AdminH2>
          <div className="flex flex-wrap gap-4 text-xs text-umber">
            <span className="flex items-center gap-1.5">
              <span className="size-3 rounded-[3px] bg-clay" /> Bloqué à la main
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-3 rounded-[3px] bg-sage-dark" /> Demande confirmée
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-3 rounded-[3px] bg-[#C9A36A]" /> Abritel / Airbnb…
            </span>
          </div>
        </div>
        {data ? <YearOverview blocks={data.blocks} /> : <p className="text-sm text-stone">Chargement…</p>}
      </AdminCard>

      <div className="mb-8 grid grid-cols-[repeat(auto-fit,minmax(min(440px,100%),1fr))] gap-7">
        <AdminCard className="p-6">
          <AdminH2 className="mb-4">Bloquer des dates</AdminH2>
          <form onSubmit={add} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <AdminLabel htmlFor="bl-start">Arrivée</AdminLabel>
                <input
                  id="bl-start"
                  type="date"
                  required
                  value={draft.start}
                  onChange={(e) => setDraft({ ...draft, start: e.target.value })}
                  className={adminInputClass}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <AdminLabel htmlFor="bl-end">Départ</AdminLabel>
                <input
                  id="bl-end"
                  type="date"
                  required
                  min={draft.start}
                  value={draft.end}
                  onChange={(e) => setDraft({ ...draft, end: e.target.value })}
                  className={adminInputClass}
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <AdminLabel htmlFor="bl-label">Libellé (visible ici seulement)</AdminLabel>
              <input
                id="bl-label"
                placeholder="Ex. Famille Martin, travaux, usage personnel…"
                value={draft.label}
                onChange={(e) => setDraft({ ...draft, label: e.target.value })}
                className={adminInputClass}
              />
            </div>
            {draft.start && draft.end > draft.start && (
              <p className="text-[12.5px] text-stone">
                {nightsBetween(draft.start, draft.end)} nuit(s) — le jour du départ reste disponible pour une arrivée.
              </p>
            )}
            <Button type="submit" variant="clay" size="pillMd" className="self-start">
              Bloquer ces dates
            </Button>
          </form>
        </AdminCard>

        <AdminCard className="p-6">
          <AdminH2 className="mb-2">Calendriers synchronisés (iCal)</AdminH2>
          <p className="mb-4 text-[12.5px] leading-relaxed text-stone">
            Collez le lien d'export iCal de votre annonce Abritel (Calendrier › Importer/Exporter › Exporter), Airbnb ou Booking : les
            réservations y sont importées automatiquement toutes les 30 minutes.
          </p>
          <div className="flex flex-col gap-2.5">
            {urls.map((u, i) => (
              <div key={i} className="flex gap-2">
                <input
                  aria-label={`Lien iCal ${i + 1}`}
                  value={u}
                  placeholder="https://www.abritel.fr/icalendar/….ics"
                  onChange={(e) => setUrls(urls.map((x, j) => (j === i ? e.target.value : x)))}
                  className={cn(adminInputClass, "rounded-xl py-2.5 text-[13px]")}
                />
                <button
                  type="button"
                  onClick={() => setUrls(urls.filter((_, j) => j !== i))}
                  className="text-[12.5px] font-semibold text-clay"
                >
                  Retirer
                </button>
              </div>
            ))}
            {urls.length < 5 && (
              <button
                type="button"
                onClick={() => setUrls([...urls, ""])}
                className="self-start rounded-full border border-dashed border-khaki px-4 py-2 text-[13px] font-semibold text-umber hover:text-ink"
              >
                + Ajouter un calendrier
              </button>
            )}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button type="button" variant="clay" size="pill" disabled={saving} onClick={saveFeeds}>
              Enregistrer & synchroniser
            </Button>
            {data?.icalUrls.length ? (
              <button type="button" onClick={sync} disabled={saving} className="text-[13px] font-semibold text-umber hover:text-ink">
                Synchroniser maintenant
              </button>
            ) : null}
          </div>
          {data?.lastSync && (
            <ul className="mt-4 flex flex-col gap-1 text-[12px] text-stone">
              <li>Dernière synchronisation {formatRelative(data.lastSync.at)}</li>
              {data.lastSync.report.map((r) => (
                <li key={r.url} className={r.ok ? "" : "text-clay"}>
                  {r.ok ? "✓" : "✗"} {new URL(r.url).hostname} — {r.ok ? `${r.count} période(s)` : r.error}
                </li>
              ))}
            </ul>
          )}
        </AdminCard>

        <AdminCard className="p-6">
          <AdminH2 className="mb-2">Envoyer vos réservations vers Abritel, Airbnb, Booking</AdminH2>
          <p className="mb-4 text-[12.5px] leading-relaxed text-stone">
            Copiez ce lien et collez-le dans chaque plateforme (Abritel : Calendrier › Importer/Exporter › Importer ; Airbnb :
            Disponibilités › Connecter un calendrier ; Booking : Tarifs et disponibilités › Synchroniser les calendriers). Les dates
            bloquées ici et les demandes confirmées y deviennent indisponibles, sans nom ni détail. Les plateformes relisent ce lien
            elles-mêmes, en général toutes les 1 à 3 heures.
          </p>
          <div className="flex gap-2">
            <input
              aria-label="Lien d'export iCal du site"
              readOnly
              value={data?.exportUrl ?? ""}
              onFocus={(e) => e.target.select()}
              className={cn(adminInputClass, "rounded-xl py-2.5 text-[13px]")}
            />
            <Button type="button" variant="clay" size="pill" disabled={!data} onClick={copyExport}>
              Copier
            </Button>
          </div>
          <p className="mt-3 text-[12px] leading-relaxed text-stone">
            Les réservations venant d'Abritel ou d'Airbnb ne sont pas renvoyées par ce lien : pour qu'Abritel connaisse celles d'Airbnb,
            reliez aussi les deux plateformes entre elles.
          </p>
          <button
            type="button"
            onClick={renewExport}
            disabled={!data}
            className="mt-3 text-[12.5px] font-semibold text-umber hover:text-ink"
          >
            Créer un nouveau lien (si l'ancien a été partagé par erreur)
          </button>
        </AdminCard>
      </div>

      <AdminH2 className="mb-4">Périodes réservées à venir</AdminH2>
      <AdminCard className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-left text-[13.5px]">
          <thead>
            <tr className="bg-wheat">
              <th className="px-4 py-3 font-semibold">Période</th>
              <th className="px-4 py-3 font-semibold">Libellé</th>
              <th className="px-4 py-3 font-semibold">Origine</th>
              <th className="w-10 px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {upcoming.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-4 text-stone">
                  Aucune période réservée à venir.
                </td>
              </tr>
            )}
            {upcoming.map((b) => (
              <tr key={b.id} className="border-t border-line">
                <td className="whitespace-nowrap px-4 py-3">
                  {formatPeriodShort(b.start, b.end)} <span className="text-stone">· {nightsBetween(b.start, b.end)} nuit(s)</span>
                </td>
                <td className="px-4 py-3 font-semibold">{b.label}</td>
                <td className="px-4 py-3">
                  <StatusBadge tone={b.source === "request" ? "sage" : b.source === "ical" ? "muted" : "wheat"}>
                    {sourceLabel[b.source ?? "manual"]}
                  </StatusBadge>
                </td>
                <td className="px-4 py-3">
                  {b.source !== "ical" && (
                    <button
                      type="button"
                      onClick={() => remove(b)}
                      className="text-clay hover:text-[#8A3B22]"
                      title="Libérer"
                      aria-label={`Libérer ${b.label}`}
                    >
                      <Icon name="trash" size={15} strokeWidth={2} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </AdminCard>
    </>
  );
}
