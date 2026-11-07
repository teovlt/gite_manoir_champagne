import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { AdminCard, AdminH2, Icon, StatusBadge, type AdminIcon } from "@/components/admin/admin-ui";
import { useAuth } from "@/providers/auth-provider";
import { api } from "@/lib/api";
import { formatRelative } from "@/lib/format";
import type { ActivityEntry, BookingRequest } from "@/lib/types";

interface DashboardData {
  stats: {
    pages: number;
    activeEvents: number;
    bannerTitle: string | null;
    requestsThisYear: number;
    newRequests: number;
    lastChange: { at: string; by: string } | null;
  };
  activity: ActivityEntry[];
  requests: BookingRequest[];
}

const quickActions: { to: string; label: string; icon: keyof typeof AdminIcon }[] = [
  { to: "/admin/contenu", label: "Modifier les textes", icon: "content" },
  { to: "/admin/photos", label: "Gérer les photos", icon: "photos" },
  { to: "/admin/banniere", label: "Ajouter un événement", icon: "calendar" },
  { to: "/admin/tarifs", label: "Mettre à jour les tarifs", icon: "pricing" },
];

const Stat = ({ label, value, hint, hintMuted }: { label: string; value: React.ReactNode; hint: string; hintMuted?: boolean }) => (
  <AdminCard className="flex-[1_1_220px] p-[22px]">
    <span className="text-xs uppercase tracking-[0.5px] text-stone">{label}</span>
    <div className="mb-1 mt-2 font-serif text-[30px] font-medium">{value}</div>
    <span className={hintMuted ? "text-[12.5px] text-stone" : "text-[12.5px] text-sage-dark"}>{hint}</span>
  </AdminCard>
);

function guests(r: BookingRequest) {
  const parts = [r.adults && `${r.adults} adulte${r.adults > 1 ? "s" : ""}`, r.children && `${r.children} enfant${r.children > 1 ? "s" : ""}`];
  return parts.filter(Boolean).join(", ") || "—";
}

function RequestRow({ r, onToggle }: { r: BookingRequest; onToggle: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <tr className="border-t border-line">
        <td className="px-4 py-3 font-semibold">
          <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="text-left hover:text-clay">
            {r.name}
          </button>
        </td>
        <td className="px-4 py-3 text-ink-soft">{r.dates || "—"}</td>
        <td className="px-4 py-3 text-ink-soft">{guests(r)}</td>
        <td className="px-4 py-3">
          <button type="button" onClick={onToggle} title="Changer le statut">
            {r.status === "nouvelle" ? <StatusBadge tone="wheat">Nouvelle</StatusBadge> : <StatusBadge tone="sage">Répondue</StatusBadge>}
          </button>
        </td>
      </tr>
      {open && (
        <tr className="bg-sand">
          <td colSpan={4} className="px-4 py-3 text-[13px] text-ink-soft">
            <p className="mb-1">
              <a href={`mailto:${r.email}?subject=${encodeURIComponent("Votre séjour au Manoir de la Champagne")}`} className="font-semibold text-clay">
                {r.email}
              </a>{" "}
              · reçue {formatRelative(r.createdAt)}
            </p>
            {r.message && <p className="whitespace-pre-line">{r.message}</p>}
          </td>
        </tr>
      )}
    </>
  );
}

export function AdminDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);

  const load = useCallback(() => {
    api
      .get<DashboardData>("/api/admin/dashboard")
      .then(setData)
      .catch((e) => toast.error(e.message));
  }, []);
  useEffect(load, [load]);

  const toggle = async (r: BookingRequest) => {
    await api.patch(`/api/admin/requests/${r.id}`, { status: r.status === "nouvelle" ? "repondue" : "nouvelle" });
    load();
  };

  const firstName = user?.name.split(" ")[0] ?? "";
  const today = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  const s = data?.stats;

  return (
    <>
      <p className="mb-6 text-sm text-stone">
        Bonjour {firstName} — voici un aperçu du site au {today}.
      </p>

      <div className="mb-8 flex flex-wrap gap-[18px]">
        <Stat label="Pages publiées" value={s?.pages ?? "…"} hint="+ 6 écrans d'administration" />
        <Stat label="Événements actifs" value={s?.activeEvents ?? "…"} hint={s?.bannerTitle ?? "Aucun affiché"} hintMuted={!s?.bannerTitle} />
        <Stat label="Demandes reçues" value={s?.requestsThisYear ?? "…"} hint={`depuis le 1er janvier · ${s?.newRequests ?? 0} nouvelle(s)`} />
        <Stat
          label="Dernière modification"
          value={s?.lastChange ? formatRelative(s.lastChange.at) : "—"}
          hint={s?.lastChange ? `par ${s.lastChange.by}` : "aucune pour l'instant"}
          hintMuted
        />
      </div>

      <AdminH2 className="mb-4 text-[19px]">Actions rapides</AdminH2>
      <div className="mb-9 flex flex-wrap gap-3.5">
        {quickActions.map((a) => (
          <Link
            key={a.to}
            to={a.to}
            className="flex flex-[1_1_220px] items-center gap-3 rounded-[14px] border border-line-strong bg-cream px-[18px] py-4 text-[13.5px] font-semibold text-ink hover:border-khaki hover:text-ink"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-wheat text-clay">
              <Icon name={a.icon} size={17} strokeWidth={1.8} />
            </span>
            {a.label}
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(420px,100%),1fr))] gap-6">
        <div>
          <AdminH2 className="mb-3 text-[19px]">Activité récente</AdminH2>
          <AdminCard className="px-5 py-1.5">
            {data?.activity.length === 0 && <p className="py-4 text-[13.5px] text-stone">Aucune modification pour l'instant.</p>}
            {data?.activity.map((a, i) => (
              <div key={a.id} className={i < data.activity.length - 1 ? "flex items-start gap-3.5 border-b border-line py-3.5" : "flex items-start gap-3.5 py-3.5"}>
                <span className="flex size-[30px] shrink-0 items-center justify-center rounded-full bg-wheat text-[11px] font-bold text-rust">
                  {a.userName.slice(0, 2)}
                </span>
                <div className="flex-1 text-[13.5px] text-ink-soft">
                  <strong className="text-ink">{a.userName}</strong> {a.message}
                </div>
                <span className="whitespace-nowrap text-xs text-stone">{formatRelative(a.createdAt)}</span>
              </div>
            ))}
          </AdminCard>
        </div>
        <div>
          <AdminH2 className="mb-3 text-[19px]">Demandes de réservation récentes</AdminH2>
          <AdminCard className="overflow-x-auto">
            <table className="w-full min-w-[480px] border-collapse text-left text-[13.5px]">
              <thead>
                <tr className="bg-wheat">
                  <th className="px-4 py-3 font-semibold">Nom</th>
                  <th className="px-4 py-3 font-semibold">Dates</th>
                  <th className="px-4 py-3 font-semibold">Voyageurs</th>
                  <th className="px-4 py-3 font-semibold">Statut</th>
                </tr>
              </thead>
              <tbody>
                {data?.requests.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-4 text-stone">
                      Aucune demande reçue pour l'instant.
                    </td>
                  </tr>
                )}
                {data?.requests.map((r) => <RequestRow key={r.id} r={r} onToggle={() => toggle(r)} />)}
              </tbody>
            </table>
          </AdminCard>
          <p className="mt-2 text-xs text-stone">Cliquez sur un nom pour voir le message, sur le statut pour le changer.</p>
        </div>
      </div>
    </>
  );
}
