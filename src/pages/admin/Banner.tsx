import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EventBannerView } from "@/components/site/event-banner";
import {
  AdminCard,
  AdminH2,
  AdminLabel,
  Icon,
  LangSwitch,
  StatusBadge,
  Toggle,
  adminInputClass,
  type AdminLang,
} from "@/components/admin/admin-ui";
import { useSiteData } from "@/providers/site-data-provider";
import { api } from "@/lib/api";
import { formatPeriodShort, todayISO } from "@/lib/format";
import type { SiteEvent } from "@/lib/types";
import { useConfirm } from "@/components/admin/confirm-dialog";

type Draft = Omit<SiteEvent, "id">;
const emptyT = () => ({ fr: "", en: "", de: "" });
const empty = (): Draft => ({ title: emptyT(), text: emptyT(), startDate: "", endDate: "", link: "/tarifs", active: true });

const pageLabels: Record<string, string> = {
  "/tarifs": "Tarifs",
  "/region": "La Région",
  "/le-gite": "Le Gîte",
  "/jardins-spa": "Jardins & Spa",
  "/contact": "Contact",
  "/avis": "Avis",
  "/": "Accueil",
};

export function AdminBanner() {
  const confirm = useConfirm();
  const { refresh } = useSiteData();
  const [events, setEvents] = useState<SiteEvent[]>([]);
  const [enabled, setEnabled] = useState(true);
  const [draft, setDraft] = useState<Draft>(empty);
  const [lang, setLang] = useState<AdminLang>("fr");
  const [editingId, setEditingId] = useState<string | null>(null);
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

  const reset = () => {
    setEditingId(null);
    setDraft(empty());
    setLang("fr");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.title.fr) {
      setLang("fr");
      return toast.error("Le titre en français est obligatoire.");
    }
    setSaving(true);
    try {
      if (editingId) await api.put(`/api/admin/events/${editingId}`, draft);
      else await api.post("/api/admin/events", draft);
      const msg = editingId ? "Événement modifié." : "Événement ajouté.";
      reset();
      await after(msg);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const edit = (ev: SiteEvent) => {
    setEditingId(ev.id);
    setDraft({
      title: { ...emptyT(), ...ev.title },
      text: { ...emptyT(), ...ev.text },
      startDate: ev.startDate,
      endDate: ev.endDate,
      link: ev.link,
      active: ev.active,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const toggleActive = async (ev: SiteEvent) => {
    try {
      await api.put(`/api/admin/events/${ev.id}`, { ...ev, active: !ev.active });
      await after(ev.active ? "Événement désactivé." : "Événement activé.");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const remove = async (ev: SiteEvent) => {
    if (!(await confirm({ title: "Supprimer l'événement ?", message: `« ${ev.title.fr} » sera supprimé définitivement.`, confirmLabel: "Supprimer", danger: true }))) return;
    try {
      await api.delete(`/api/admin/events/${ev.id}`);
      if (editingId === ev.id) reset();
      await after("Événement supprimé.");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  // Same rule as the server: most recent active event whose period includes today.
  const now = todayISO();
  const shown = enabled
    ? events.filter((e) => e.active && e.startDate <= now && e.endDate >= now).sort((a, b) => b.startDate.localeCompare(a.startDate))[0]
    : undefined;
  const preview = draft.title.fr ? draft : shown;

  const setTr = (k: "title" | "text") => (e: React.ChangeEvent<HTMLInputElement>) =>
    setDraft({ ...draft, [k]: { ...draft[k], [lang]: e.target.value } });
  const grid = "grid grid-cols-[1.4fr_1fr_1.6fr_1fr_auto_auto] gap-3.5";
  const missing = (["en", "de"] as const).filter((l) => draft.title.fr && !draft.title[l]);

  return (
    <>
      <AdminCard className="mb-7 flex flex-wrap items-center justify-between gap-4 px-[22px] py-[18px]">
        <div>
          <span className="text-[14.5px] font-semibold">Afficher la bannière d'événements sur la page d'accueil</span>
          <p className="mt-1 text-[13px] text-stone">
            Un événement « Actif » s'affiche en haut de l'accueil de sa date de début à sa date de fin (le plus récent s'il y en a
            plusieurs).
          </p>
        </div>
        <Toggle checked={enabled} onChange={toggleBanner} label="Afficher la bannière d'événements sur la page d'accueil" />
      </AdminCard>

      <div className="mb-8 grid grid-cols-[repeat(auto-fit,minmax(min(480px,100%),1fr))] gap-7">
        <AdminCard className="p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <AdminH2>{editingId ? "Modifier l'événement" : "Ajouter un événement"}</AdminH2>
            <LangSwitch value={lang} onChange={setLang} />
          </div>
          <form onSubmit={submit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <AdminLabel htmlFor="ev-title">Titre ({lang.toUpperCase()})</AdminLabel>
              <input
                id="ev-title"
                required={lang === "fr"}
                placeholder={lang === "fr" ? "Ex. Marché de Noël de Carentan" : draft.title.fr}
                value={draft.title[lang]}
                onChange={setTr("title")}
                className={adminInputClass}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <AdminLabel htmlFor="ev-start">Début</AdminLabel>
                <input
                  id="ev-start"
                  type="date"
                  required
                  value={draft.startDate}
                  onChange={(e) => setDraft({ ...draft, startDate: e.target.value })}
                  className={adminInputClass}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <AdminLabel htmlFor="ev-end">Fin</AdminLabel>
                <input
                  id="ev-end"
                  type="date"
                  required
                  min={draft.startDate}
                  value={draft.endDate}
                  onChange={(e) => setDraft({ ...draft, endDate: e.target.value })}
                  className={adminInputClass}
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <AdminLabel htmlFor="ev-text">Texte affiché ({lang.toUpperCase()})</AdminLabel>
              <input
                id="ev-text"
                placeholder={lang === "fr" ? "Ex. -10 % sur les séjours de 3 nuits" : draft.text.fr}
                value={draft.text[lang]}
                onChange={setTr("text")}
                className={adminInputClass}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <AdminLabel htmlFor="ev-link">Lien (page du site)</AdminLabel>
              <select
                id="ev-link"
                value={draft.link}
                onChange={(e) => setDraft({ ...draft, link: e.target.value })}
                className={adminInputClass}
              >
                {Object.entries(pageLabels).map(([to, label]) => (
                  <option key={to} value={to}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-2 text-[13px] text-umber">
              <input
                type="checkbox"
                checked={draft.active}
                onChange={(e) => setDraft({ ...draft, active: e.target.checked })}
                className="accent-sage-dark"
              />
              Actif (affiché sur l'accueil pendant la période)
            </label>
            {missing.length > 0 && (
              <p className="text-[13px] text-stone">
                Sans traduction {missing.map((m) => m.toUpperCase()).join(" / ")}, le texte français s'affiche sur les versions étrangères
                du site.
              </p>
            )}
            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" variant="clay" size="pillMd" disabled={saving}>
                {editingId ? "Enregistrer l'événement" : "Ajouter l'événement"}
              </Button>
              {editingId && (
                <button type="button" onClick={reset} className="text-[13px] font-semibold text-umber hover:text-ink">
                  Annuler
                </button>
              )}
            </div>
          </form>
        </AdminCard>

        <AdminCard className="p-6">
          <AdminH2 className="mb-4">Aperçu sur la page d'accueil ({lang.toUpperCase()})</AdminH2>
          <div className="overflow-hidden rounded-xl">
            {preview ? (
              <EventBannerView event={preview} lang={lang} />
            ) : (
              <div className="rounded-xl border border-dashed border-khaki p-6 text-center text-[13px] text-stone">
                {enabled ? "Aucun événement en cours aujourd'hui : rien ne s'affiche." : "La bannière est masquée."}
              </div>
            )}
          </div>
          <p className="mt-3.5 text-[13px] text-stone">
            {draft.title.fr
              ? "Aperçu de l'événement en cours de saisie."
              : "C'est exactement ce que vos visiteurs verront en haut de la page d'accueil, juste sous le menu."}
          </p>
        </AdminCard>
      </div>

      <AdminH2 className="mb-4">Événements enregistrés</AdminH2>
      <AdminCard className="overflow-x-auto">
        <div className="min-w-[760px]">
          <div className={`${grid} bg-wheat px-[18px] py-3 text-[12px] uppercase tracking-[0.5px] text-stone`}>
            <span>Titre</span>
            <span>Période</span>
            <span>Texte</span>
            <span>Lien</span>
            <span>Statut</span>
            <span className="w-[50px]" />
          </div>
          {events.length === 0 && (
            <p className="border-t border-line px-[18px] py-4 text-[13px] text-stone">Aucun événement pour l'instant.</p>
          )}
          {events.map((ev) => {
            const over = ev.endDate < now;
            const upcoming = ev.startDate > now;
            return (
              <div key={ev.id} className={`${grid} items-center border-t border-line px-[18px] py-4`}>
                <span className="text-[13.5px] font-semibold">
                  {ev.title.fr}
                  {(!ev.title.en || !ev.title.de) && <span className="ml-2 text-[11.5px] font-normal text-pebble">non traduit</span>}
                </span>
                <span className="text-[13px] text-umber">{formatPeriodShort(ev.startDate, ev.endDate)}</span>
                <span className="text-[13px] text-ink-soft">{ev.text.fr}</span>
                <span className="text-[13px] text-stone">{pageLabels[ev.link] ?? ev.link}</span>
                <button type="button" onClick={() => toggleActive(ev)} title={ev.active ? "Désactiver" : "Activer"}>
                  {over ? (
                    <StatusBadge tone="muted">Terminé</StatusBadge>
                  ) : !ev.active ? (
                    <StatusBadge tone="wheat">Inactif</StatusBadge>
                  ) : upcoming ? (
                    <StatusBadge tone="wheat">À venir</StatusBadge>
                  ) : (
                    <StatusBadge tone="sage">Actif</StatusBadge>
                  )}
                </button>
                <div className="flex w-[50px] gap-2.5">
                  <button
                    type="button"
                    onClick={() => edit(ev)}
                    className="text-umber hover:text-ink"
                    title="Modifier"
                    aria-label={`Modifier ${ev.title.fr}`}
                  >
                    <Icon name="edit" size={15} strokeWidth={2} />
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(ev)}
                    className="text-clay hover:text-[#8A3B22]"
                    title="Supprimer"
                    aria-label={`Supprimer ${ev.title.fr}`}
                  >
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
