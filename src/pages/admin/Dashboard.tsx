import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { AdminCard, AdminH2, Icon, type AdminIcon } from "@/components/admin/admin-ui";
import { RequestStatusBadge, guestsLabel, isQuestion, requestDatesLabel } from "@/components/admin/request-status";
import { useAuth } from "@/providers/auth-provider";
import { api } from "@/lib/api";
import { formatPeriodShort, formatRelative } from "@/lib/format";
import type { ActivityEntry, AvailabilityBlock, BookingRequest, CalendarConflict } from "@/lib/types";
import { CalendarConflicts } from "@/components/admin/calendar-conflicts";

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
  upcoming: AvailabilityBlock[];
  conflicts: CalendarConflict[];
}

const quickActions: { to: string; label: string; icon: keyof typeof AdminIcon }[] = [
  { to: "/admin/contenu", label: "Modifier les textes", icon: "content" },
  { to: "/admin/photos", label: "Gérer les photos", icon: "photos" },
  { to: "/admin/banniere", label: "Ajouter un événement", icon: "banner" },
  { to: "/admin/calendrier", label: "Bloquer des dates", icon: "calendar" },
];

const Stat = ({ label, value, hint, hintMuted, to }: { label: string; value: React.ReactNode; hint: string; hintMuted?: boolean; to?: string }) => {
  const body = (
    <>
      <span className="text-xs uppercase tracking-[0.5px] text-stone">{label}</span>
      <div className="mb-1 mt-2 font-serif text-[30px] font-medium">{value}</div>
      <span className={hintMuted ? "text-[12.5px] text-stone" : "text-[12.5px] text-sage-dark"}>{hint}</span>
    </>
  );
  return to ? (
    <Link to={to} className="flex-[1_1_220px] rounded-2xl border border-line-strong bg-cream p-[22px] text-ink transition hover:border-khaki hover:text-ink">
      {body}
    </Link>
  ) : (
    <AdminCard className="flex-[1_1_220px] p-[22px]">{body}</AdminCard>
  );
};

export function AdminDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    api
      .get<DashboardData>("/api/admin/dashboard")
      .then(setData)
      .catch((e) => toast.error(e.message));
  }, []);

  const firstName = user?.name.split(" ")[0] ?? "";
  const today = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  const s = data?.stats;

  return (
    <>
      <p className="mb-6 text-sm text-stone">
        Bonjour {firstName} — voici un aperçu du site au {today}.
      </p>

      {data && <CalendarConflicts conflicts={data.conflicts} />}

      <div className="mb-8 flex flex-wrap gap-[18px]">
        <Stat label="Demandes à traiter" value={s?.newRequests ?? "…"} hint={`${s?.requestsThisYear ?? 0} reçues depuis le 1er janvier`} to="/admin/demandes" />
        <Stat label="Événements actifs" value={s?.activeEvents ?? "…"} hint={s?.bannerTitle ?? "Aucun affiché"} hintMuted={!s?.bannerTitle} to="/admin/banniere" />
        <Stat label="Pages publiées" value={s ? s.pages : "…"} hint="en français, anglais et allemand" />
        <Stat label="Dernière modification" value={s?.lastChange ? formatRelative(s.lastChange.at) : "—"} hint={s?.lastChange ? `par ${s.lastChange.by}` : "aucune pour l'instant"} hintMuted />
      </div>

      <AdminH2 className="mb-4 text-[19px]">Actions rapides</AdminH2>
      <div className="mb-9 flex flex-wrap gap-3.5">
        {quickActions.map((a) => (
          <Link
            key={a.to}
            to={a.to}
            className="flex flex-[1_1_220px] items-center gap-3 rounded-[14px] border border-line-strong bg-cream px-[18px] py-4 text-[13.5px] font-semibold text-ink transition hover:-translate-y-0.5 hover:border-khaki hover:text-ink"
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
                <span className="flex size-[30px] shrink-0 items-center justify-center rounded-full bg-wheat text-[11px] font-bold text-rust">{a.userName.slice(0, 2)}</span>
                <div className="flex-1 text-[13.5px] text-ink-soft">
                  <strong className="text-ink">{a.userName}</strong> {a.message}
                </div>
                <span className="whitespace-nowrap text-xs text-stone">{formatRelative(a.createdAt)}</span>
              </div>
            ))}
          </AdminCard>
        </div>
        <div className="flex flex-col gap-6">
          <div>
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <AdminH2 className="text-[19px]">Demandes récentes</AdminH2>
              <Link to="/admin/demandes" className="text-[12.5px] font-semibold text-clay">
                Tout voir →
              </Link>
            </div>
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
                  {data?.requests.map((r) => (
                    <tr key={r.id} className="border-t border-line">
                      <td className="px-4 py-3 font-semibold">{r.name}</td>
                      <td className="px-4 py-3 text-ink-soft">{requestDatesLabel(r, formatPeriodShort)}</td>
                      <td className="px-4 py-3 text-ink-soft">{isQuestion(r) ? "—" : guestsLabel(r)}</td>
                      <td className="px-4 py-3">
                        <RequestStatusBadge status={r.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </AdminCard>
          </div>
          <div>
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <AdminH2 className="text-[19px]">Prochains séjours bloqués</AdminH2>
              <Link to="/admin/calendrier" className="text-[12.5px] font-semibold text-clay">
                Calendrier →
              </Link>
            </div>
            <AdminCard className="px-5 py-1.5">
              {data?.upcoming.length === 0 && <p className="py-4 text-[13.5px] text-stone">Aucune période réservée à venir.</p>}
              {data?.upcoming.map((b, i) => (
                <div key={b.id} className={i < data.upcoming.length - 1 ? "flex justify-between gap-3 border-b border-line py-3 text-[13.5px]" : "flex justify-between gap-3 py-3 text-[13.5px]"}>
                  <span className="font-semibold">{b.label}</span>
                  <span className="whitespace-nowrap text-umber">{formatPeriodShort(b.start, b.end)}</span>
                </div>
              ))}
            </AdminCard>
          </div>
        </div>
      </div>
    </>
  );
}
