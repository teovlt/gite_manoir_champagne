import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EventBannerView } from "@/components/site/event-banner";
import { AdminCard, AdminH2, AdminLabel, Icon, StatusBadge, Toggle, adminInputClass } from "@/components/admin/admin-ui";
import { useSiteData } from "@/providers/site-data-provider";
import { api } from "@/lib/api";
import { formatPeriodShort } from "@/lib/format";
import type { SiteEvent } from "@/lib/types";

type Draft = Omit<SiteEvent, "id">;
const empty: Draft = { title: "", startDate: "", endDate: "", text: "", link: "/tarifs", active: true };

const pageLabels: Record<string, string> = {
  "/tarifs": "Tarifs",
  "/region": "La Région",
  "/le-gite": "Le Gîte",
  "/jardins-spa": "Jardins & Spa",
  "/contact": "Contact",
  "/avis": "Avis",
  "/": "Accueil",
};

const today = () => new Date().toISOString().slice(0, 10);

export function AdminBanner() {
  const { refresh } = useSiteData();
  const [events, setEvents] = useState<SiteEvent[]>([]);
  const [enabled, setEnabled] = useState(true);
  const [draft, setDraft] = useState<Draft>(empty);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await api.get<{ bannerEnabled: boolean; events: SiteEvent[] }>("/api/admin/events");
    setEvents(res.events);
    setEnabled(res.bannerEnabled);
  }, []);
  useEffect(() => {
    load().catch((e) => toast.error(e.message));
  }, [load]);

  const after = async (message: string) => {
    toast.success(message);
    await Promise.all([load(), refresh()]);
  };

  const toggleBanner = async (value: boolean) => {
    setEnabled(value);
    try {
      await api.put("/api/admin/banner", { enabled: value });
      await after(value ? "La bannière est affichée sur l'accueil." : "La bannière est masquée.");
    } catch (e) {
      setEnabled(!value);
      toast.error((e as Error).message);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) await api.put(`/api/admin/events/${editingId}`, draft);
      else await api.post("/api/admin/events", draft);
      const msg = editingId ? "Événement modifié." : "Événement ajouté.";
      setDraft(empty);
      setEditingId(null);
      await after(msg);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const edit = (ev: SiteEvent) => {
    setEditingId(ev.id);
    setDraft({ title: ev.title, startDate: ev.startDate, endDate: ev.endDate, text: ev.text, link: ev.link, active: ev.active });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const toggleActive = async (ev: SiteEvent) => {
    await api.put(`/api/admin/events/${ev.id}`, { ...ev, active: !ev.active });
    await after(ev.active ? "Événement désactivé." : "Événement activé.");
  };

  const remove = async (ev: SiteEvent) => {
    if (!window.confirm(`Supprimer définitivement l'événement « ${ev.title} » ?`)) return;
    await api.delete(`/api/admin/events/${ev.id}`);
    if (editingId === ev.id) {
      setEditingId(null);
      setDraft(empty);
    }
    await after("Événement supprimé.");
  };

  // Same rule as the server: most recent active event that is not over.
  const shown = enabled ? events.filter((e) => e.active && e.endDate >= today()).sort((a, b) => b.startDate.localeCompare(a.startDate))[0] : undefined;
  const preview = draft.title ? draft : shown;

  const set = (k: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setDraft({ ...draft, [k]: e.target.value });
  const grid = "grid grid-cols-[1.4fr_1fr_1.6fr_1fr_auto_auto] gap-3.5";

  return (
    <>
      <AdminCard className="mb-7 flex flex-wrap items-center justify-between gap-4 px-[22px] py-[18px]">
        <div>
          <span id="banner-toggle-label" className="text-[14.5px] font-semibold">
            Afficher la bannière d'événements sur la page d'accueil
          </span>
          <p className="mt-1 text-[12.5px] text-stone">Seul l'événement marqué « Actif » le plus récent s'affiche en haut de l'accueil.</p>
        </div>
        <Toggle checked={enabled} onChange={toggleBanner} label="Afficher la bannière d'événements sur la page d'accueil" />
      </AdminCard>

      <div className="mb-8 grid grid-cols-[repeat(auto-fit,minmax(min(480px,100%),1fr))] gap-7">
        <AdminCard className="p-6">
          <AdminH2 className="mb-4">{editingId ? "Modifier l'événement" : "Ajouter un événement"}</AdminH2>
          <form onSubmit={submit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <AdminLabel htmlFor="ev-title">Titre</AdminLabel>
              <input id="ev-title" required placeholder="Ex. Marché de Noël de Carentan" value={draft.title} onChange={set("title")} className={adminInputClass} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <AdminLabel htmlFor="ev-start">Début</AdminLabel>
                <input id="ev-start" type="date" required value={draft.startDate} onChange={set("startDate")} className={adminInputClass} />
              </div>
              <div className="flex flex-col gap-1.5">
                <AdminLabel htmlFor="ev-end">Fin</AdminLabel>
                <input id="ev-end" type="date" required min={draft.startDate} value={draft.endDate} onChange={set("endDate")} className={adminInputClass} />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <AdminLabel htmlFor="ev-text">Texte affiché</AdminLabel>
              <input id="ev-text" placeholder="Ex. -10 % sur les séjours de 3 nuits" value={draft.text} onChange={set("text")} className={adminInputClass} />
            </div>
            <div className="flex flex-col gap-1.5">
              <AdminLabel htmlFor="ev-link">Lien (page du site)</AdminLabel>
              <select id="ev-link" value={draft.link} onChange={set("link")} className={adminInputClass}>
                {Object.entries(pageLabels).map(([to, label]) => (
                  <option key={to} value={to}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-2 text-[13px] text-umber">
              <input type="checkbox" checked={draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} className="accent-sage-dark" />
              Actif (affiché sur l'accueil pendant la période)
            </label>
            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" variant="clay" size="pillMd" disabled={saving}>
                {editingId ? "Enregistrer l'événement" : "Ajouter l'événement"}
              </Button>
              {editingId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null);
                    setDraft(empty);
                  }}
                  className="text-[13px] font-semibold text-umber hover:text-ink"
                >
                  Annuler
                </button>
              )}
            </div>
          </form>
        </AdminCard>

        <AdminCard className="p-6">
          <AdminH2 className="mb-4">Aperçu sur la page d'accueil</AdminH2>
          <div className="overflow-hidden rounded-xl">
            {preview ? (
              <EventBannerView event={preview} />
            ) : (
              <div className="rounded-xl border border-dashed border-khaki p-6 text-center text-[13px] text-stone">
                {enabled ? "Aucun événement actif en cours : rien ne s'affiche." : "La bannière est masquée."}
              </div>
            )}
          </div>
          <p className="mt-3.5 text-[12.5px] text-stone">
            {draft.title
              ? "Aperçu de l'événement en cours de saisie."
              : "C'est exactement ce que vos visiteurs verront en haut de la page d'accueil, juste sous le menu."}
          </p>
        </AdminCard>
      </div>

      <AdminH2 className="mb-4">Événements enregistrés</AdminH2>
      <AdminCard className="overflow-x-auto">
        <div className="min-w-[760px]">
          <div className={`${grid} bg-wheat px-[18px] py-3 text-[11px] uppercase tracking-[0.5px] text-stone`}>
            <span>Titre</span>
            <span>Période</span>
            <span>Texte</span>
            <span>Lien</span>
            <span>Statut</span>
            <span className="w-[50px]" />
          </div>
          {events.length === 0 && <p className="border-t border-line px-[18px] py-4 text-[13px] text-stone">Aucun événement pour l'instant.</p>}
          {events.map((ev) => {
            const over = ev.endDate < today();
            return (
              <div key={ev.id} className={`${grid} items-center border-t border-line px-[18px] py-4`}>
                <span className="text-[13.5px] font-semibold">{ev.title}</span>
                <span className="text-[13px] text-umber">{formatPeriodShort(ev.startDate, ev.endDate)}</span>
                <span className="text-[13px] text-ink-soft">{ev.text}</span>
                <span className="text-[12.5px] text-stone">{pageLabels[ev.link] ?? ev.link}</span>
                <button type="button" onClick={() => toggleActive(ev)} title={ev.active ? "Désactiver" : "Activer"}>
                  {over ? <StatusBadge tone="muted">Terminé</StatusBadge> : ev.active ? <StatusBadge tone="sage">Actif</StatusBadge> : <StatusBadge tone="wheat">Inactif</StatusBadge>}
                </button>
                <div className="flex w-[50px] gap-2.5">
                  <button type="button" onClick={() => edit(ev)} className="text-umber hover:text-ink" title="Modifier" aria-label={`Modifier ${ev.title}`}>
                    <Icon name="edit" size={15} strokeWidth={2} />
                  </button>
                  <button type="button" onClick={() => remove(ev)} className="text-clay hover:text-[#8A3B22]" title="Supprimer" aria-label={`Supprimer ${ev.title}`}>
                    <Icon name="trash" size={15} strokeWidth={2} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </AdminCard>
    </>
  );
}
