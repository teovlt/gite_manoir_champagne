import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { AdminCard, Icon, PillTabs } from "@/components/admin/admin-ui";
import { KindBadge, RequestStatusBadge, guestsLabel, isQuestion, statusLabels } from "@/components/admin/request-status";
import { api } from "@/lib/api";
import { formatPeriodShort, formatRelative } from "@/lib/format";
import type { BookingRequest, RequestStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

type Filter = "all" | RequestStatus;
const filters: { id: Filter; label: string }[] = [
  { id: "all", label: "Toutes" },
  ...(Object.entries(statusLabels) as [RequestStatus, string][]).map(([id, label]) => ({ id, label })),
];

const replySubject = {
  fr: "Votre séjour au Manoir de la Champagne",
  en: "Your stay at the Manoir de la Champagne",
  de: "Ihr Aufenthalt im Manoir de la Champagne",
} as Record<string, string>;

const questionSubject = {
  fr: "Votre message au Manoir de la Champagne",
  en: "Your message to the Manoir de la Champagne",
  de: "Ihre Nachricht an das Manoir de la Champagne",
} as Record<string, string>;

function RequestCard({ r, onChange }: { r: BookingRequest; onChange: () => void }) {
  const [note, setNote] = useState(r.note ?? "");
  const [busy, setBusy] = useState(false);

  const savedNote = r.note ?? "";
  const question = isQuestion(r);
  const subjects = question ? questionSubject : replySubject;
  const update = async (status: RequestStatus) => {
    setBusy(true);
    try {
      await api.patch(`/api/admin/requests/${r.id}`, { status, note });
      if (status === r.status) toast.success("Note enregistrée.");
      else
        toast.success(
          status === "confirmee" && r.arrival ? "Séjour confirmé — les dates sont bloquées dans le calendrier." : "Statut mis à jour.",
        );
      onChange();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm(`Supprimer définitivement ${question ? "la question" : "la demande"} de ${r.name} ?`)) return;
    try {
      await api.delete(`/api/admin/requests/${r.id}`);
      toast.success("Demande supprimée.");
      onChange();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const btn = "rounded-full border px-3.5 py-1.5 text-[12.5px] font-semibold transition-colors disabled:opacity-50";

  return (
    <AdminCard className={cn("flex flex-col gap-3 p-5", busy && "opacity-70")}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-[15px] font-semibold">{r.name}</h3>
          <a
            href={`mailto:${r.email}?subject=${encodeURIComponent(subjects[r.lang] ?? subjects.fr)}`}
            className="text-[13px] font-semibold text-clay"
          >
            {r.email}
          </a>
        </div>
        <div className="flex items-center gap-2">
          <KindBadge r={r} />
          <span className="rounded-full bg-line px-2 py-0.5 text-[10px] font-bold uppercase text-stone" title="Langue du visiteur">
            {r.lang}
          </span>
          <RequestStatusBadge status={r.status} />
        </div>
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-[13px]">
        {!question && (
          <>
            <dt className="text-stone">Dates</dt>
            <dd>{r.arrival && r.departure ? formatPeriodShort(r.arrival, r.departure) : r.dates || "—"}</dd>
            <dt className="text-stone">Voyageurs</dt>
            <dd>{guestsLabel(r)}</dd>
          </>
        )}
        <dt className="text-stone">Reçue</dt>
        <dd>{formatRelative(r.createdAt)}</dd>
      </dl>
      {r.message && <p className="whitespace-pre-line rounded-xl bg-sand px-3.5 py-3 text-[13px] text-ink-soft">{r.message}</p>}
      <label className="flex flex-col gap-1 text-[11px] uppercase tracking-[0.5px] text-stone">
        Note interne
        <textarea
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onBlur={(e) => {
            const toStatusButton = (e.relatedTarget as HTMLElement | null)?.dataset.status;
            if (note !== savedNote && !toStatusButton) update(r.status);
          }}
          placeholder="Ex. rappelé le 12/03, attend la confirmation de la famille…"
          className="rounded-xl border border-line-strong bg-cream px-3 py-2 text-[13px] normal-case tracking-normal text-ink outline-none focus-visible:border-sage-dark"
        />
      </label>
      <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
        {r.status !== "repondue" && (
          <button
            type="button"
            disabled={busy}
            data-status="repondue"
            onClick={() => update("repondue")}
            className={cn(btn, "border-line-strong text-umber hover:text-ink")}
          >
            Marquer répondue
          </button>
        )}
        {r.status !== "confirmee" && !question && (
          <button
            type="button"
            disabled={busy}
            data-status="confirmee"
            onClick={() => update("confirmee")}
            className={cn(btn, "border-sage-dark bg-sage-dark text-cream hover:bg-moss")}
          >
            Confirmer le séjour
          </button>
        )}
        {r.status !== "refusee" && (
          <button
            type="button"
            disabled={busy}
            data-status="refusee"
            onClick={() => update("refusee")}
            className={cn(btn, "border-line-strong text-umber hover:text-ink")}
          >
            Refuser
          </button>
        )}
        {r.status !== "nouvelle" && (
          <button
            type="button"
            disabled={busy}
            data-status="nouvelle"
            onClick={() => update("nouvelle")}
            className={cn(btn, "border-transparent text-stone hover:text-ink")}
          >
            Rouvrir
          </button>
        )}
        <button
          type="button"
          onClick={remove}
          className="ml-auto text-clay hover:text-[#8A3B22]"
          title="Supprimer"
          aria-label={`Supprimer la demande de ${r.name}`}
        >
          <Icon name="trash" size={16} strokeWidth={2} />
        </button>
      </div>
    </AdminCard>
  );
}

export function AdminRequests() {
  const [filter, setFilter] = useState<Filter>("all");
  const [requests, setRequests] = useState<BookingRequest[] | null>(null);

  const load = useCallback(async () => {
    try {
      setRequests(await api.get<BookingRequest[]>(`/api/admin/requests${filter === "all" ? "" : `?status=${filter}`}`));
    } catch (e) {
      toast.error((e as Error).message);
    }
  }, [filter]);
  useEffect(() => {
    load();
  }, [load]);

  return (
    <>
      <PillTabs label="Filtrer les demandes" items={filters} value={filter} onChange={setFilter} className="mb-6" />
      <p className="mb-6 text-[13px] text-stone">
        Confirmer un séjour bloque automatiquement ses dates dans le calendrier public. Le visiteur reçoit un accusé de réception dès
        l'envoi de sa demande (si l'envoi d'e-mails est configuré).
      </p>
      {requests?.length === 0 && <AdminCard className="p-6 text-[13.5px] text-stone">Aucune demande dans cette catégorie.</AdminCard>}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(380px,100%),1fr))] gap-5">
        {requests?.map((r) => (
          <RequestCard key={`${r.id}-${r.status}`} r={r} onChange={load} />
        ))}
      </div>
    </>
  );
}
