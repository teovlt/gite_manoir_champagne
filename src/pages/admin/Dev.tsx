import { useCallback, useEffect, useRef, useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AdminCard,
  AdminH2,
  AdminLabel,
  Icon,
  LangSwitch,
  PillTabs,
  StatusBadge,
  Toggle,
  adminInputClass,
  adminSecondaryButtonClass,
  type AdminIcon,
  type AdminLang,
} from "@/components/admin/admin-ui";
import { useConfirm } from "@/components/admin/confirm-dialog";
import { SYSTEM_STATUS_EVENT } from "@/components/admin/admin-layout";
import { useAuth } from "@/providers/auth-provider";
import { api } from "@/lib/api";
import { formatRelative } from "@/lib/format";
import { isDeveloper, roleLabels } from "@/lib/roles";
import { cn } from "@/lib/utils";
import type { AdminUser, UserRole } from "@/lib/types";

// ---------------------------------------------------------------- types

type AccessMode = "normal" | "readonly" | "devOnly";

interface Maintenance {
  enabled: boolean;
  message?: Partial<Record<AdminLang, string>>;
  until?: string | null;
  by?: string;
  at?: string;
}

interface BackupEntry {
  id: string;
  at: string;
  trigger: "auto" | "manual" | "download" | "restore-point";
  kind: "data" | "photos" | "full";
  by?: string | null;
  to?: string;
  ok: boolean;
  error?: string;
  bytes?: number;
  parts?: number;
  label?: string;
  counts?: Record<string, number>;
}

interface Overview {
  server: {
    startedAt: string;
    uptime: number;
    node: string;
    platform: string;
    hostname: string;
    memory: { rss: number; heapUsed: number; heapTotal: number };
    system: { total: number; free: number; load: number[]; cpus: number };
    tz: string;
  };
  database: {
    name: string;
    host: string;
    version: string | null;
    pingMs: number;
    dataSize: number | null;
    storageSize: number | null;
    indexSize: number | null;
    collections: { name: string; count: number; size: number | null }[];
  };
  env: { name: string; set: boolean; value: string | null }[];
  mail: { enabled: boolean; from: string | null; notify: string | null };
  maintenance: Maintenance;
  adminAccess: AccessMode;
  ical: { at: string; report: { url: string; ok: boolean; count?: number; error?: string }[] } | null;
  backups: { schedule: BackupSchedule | null; last: BackupEntry | null };
  security: { activeSessions: number; failed24h: number };
}

interface BackupSchedule {
  to: string;
  hour: number;
  lastDate: string | null;
  photosDate: string | null;
}

interface Session {
  id: string;
  current: boolean;
  user: { id: string; name: string; email: string; role: UserRole };
  ip: string;
  ua: string;
  remember: boolean;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
}

interface LoginEntry {
  id: string;
  at: string;
  email: string;
  name: string | null;
  ok: boolean;
  reason: "password" | "unknown" | "disabled" | "closed" | "reset";
  ip: string;
  ua: string;
}

interface DevUser extends AdminUser {
  sessions: number;
  lastSignIn: { at: string; ip: string; ua: string } | null;
}

interface RestorePoint {
  id: string;
  filename: string;
  at: string;
  bytes: number;
  label: string;
  by: string | null;
  counts: Record<string, number>;
}

interface Inspection {
  filename: string;
  bytes: number;
  meta: { site?: string; kind?: string; createdAt?: string; db?: string } | null;
  collections: { name: string; count: number; current: number; mode: "merge" | "replace"; skipped: boolean }[];
}

interface LogLine {
  id: number;
  at: string;
  level: "log" | "warn" | "error";
  text: string;
}

// ---------------------------------------------------------------- helpers

const bytes = (n: number | null | undefined) => {
  if (n == null) return "—";
  if (n < 1024) return `${n} o`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} Ko`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} Mo`;
  return `${(n / 1024 ** 3).toFixed(2)} Go`;
};

const duration = (s: number) => {
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return d ? `${d} j ${h} h` : h ? `${h} h ${m} min` : `${m} min`;
};

const dateTime = (iso: string) =>
  new Date(iso).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/** "Firefox · Linux" from a user agent, enough to recognise a device. */
function device(ua = "") {
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\//.test(ua)
      ? "Opera"
      : /Firefox\//.test(ua)
        ? "Firefox"
        : /Chrome\//.test(ua)
          ? "Chrome"
          : /Safari\//.test(ua)
            ? "Safari"
            : /curl|wget|python|node/i.test(ua)
              ? "Script"
              : "Navigateur inconnu";
  const os = /iPhone|iPad/.test(ua)
    ? "iOS"
    : /Android/.test(ua)
      ? "Android"
      : /Windows/.test(ua)
        ? "Windows"
        : /Mac OS X/.test(ua)
          ? "macOS"
          : /Linux/.test(ua)
            ? "Linux"
            : "";
  const mobile = /Mobile|iPhone|Android/.test(ua);
  return { label: [browser, os].filter(Boolean).join(" · "), mobile };
}

const errorToast = (e: unknown) => toast.error((e as Error).message);

const reasonLabels: Record<LoginEntry["reason"], string> = {
  password: "mot de passe",
  reset: "lien de réinitialisation",
  unknown: "e-mail inconnu",
  disabled: "compte suspendu",
  closed: "admin fermée",
};

const tdClass = "px-3 py-2.5 align-top";
const thClass = "px-3 py-2 text-left text-[11.5px] font-semibold uppercase tracking-[0.5px] text-stone";

function Table({
  head,
  children,
  className,
  compact,
}: {
  head: string[];
  children: React.ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className={cn("w-full border-collapse text-[13px]", !compact && "min-w-[560px]")}>
        <thead>
          <tr className="border-b border-line-strong">
            {head.map((h) => (
              <th key={h} className={thClass}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="[&>tr]:border-b [&>tr]:border-line [&>tr:last-child]:border-0">{children}</tbody>
      </table>
    </div>
  );
}

const Mono = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <span className={cn("font-mono text-[12.5px] text-olive", className)}>{children}</span>
);

function Stat({
  icon,
  label,
  value,
  hint,
  tone = "default",
}: {
  icon: keyof typeof AdminIcon;
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: "default" | "warn" | "ok";
}) {
  return (
    <AdminCard className="flex items-start gap-3.5 p-4">
      <span
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-xl",
          tone === "warn" ? "bg-wheat text-clay" : tone === "ok" ? "bg-moss-light text-moss" : "bg-parchment text-umber",
        )}
      >
        <Icon name={icon} size={19} />
      </span>
      <div className="min-w-0">
        <p className="text-[12px] uppercase tracking-[0.5px] text-stone">{label}</p>
        <p className="mt-0.5 truncate font-serif text-[19px] font-medium text-ink">{value}</p>
        {hint && <p className="mt-0.5 text-[12.5px] text-stone">{hint}</p>}
      </div>
    </AdminCard>
  );
}

function useLoad<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setData(await api.get<T>(url));
    } catch (e) {
      errorToast(e);
    } finally {
      setLoading(false);
    }
  }, [url]);
  useEffect(() => {
    reload();
  }, [reload]);
  return { data, loading, reload, setData };
}

const RefreshButton = ({ onClick, loading }: { onClick: () => void; loading?: boolean }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={loading}
    className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-umber hover:text-ink disabled:opacity-50"
  >
    <Icon name="refresh" size={15} className={loading ? "animate-spin" : undefined} />
    Actualiser
  </button>
);

// ---------------------------------------------------------------- overview

function OverviewTab({ onNavigate }: { onNavigate: (tab: Tab) => void }) {
  const { data, loading, reload } = useLoad<Overview>("/api/admin/dev/overview");
  const checks = useLoad<{ label: string; ok: boolean; detail: string }[]>("/api/admin/dev/tools/check");
  const [mailTo, setMailTo] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    try {
      await fn();
    } catch (e) {
      errorToast(e);
    } finally {
      setBusy(null);
    }
  };

  if (!data) return <p className="text-[14px] text-stone">{loading ? "Chargement…" : "Impossible de charger l'état du serveur."}</p>;
  const { server, database, security, backups } = data;
  const lastBackup = backups.last;

  return (
    <div className="flex flex-col gap-7">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
        <Stat
          icon="power"
          label="Site public"
          value={data.maintenance.enabled ? "En maintenance" : "En ligne"}
          tone={data.maintenance.enabled ? "warn" : "ok"}
          hint={
            <button type="button" className="font-semibold text-clay" onClick={() => onNavigate("access")}>
              Gérer →
            </button>
          }
        />
        <Stat
          icon="shield"
          label="Accès admin"
          value={{ normal: "Normal", readonly: "Lecture seule", devOnly: "Développeurs" }[data.adminAccess]}
          tone={data.adminAccess === "normal" ? "ok" : "warn"}
          hint={`${security.activeSessions} session(s) ouverte(s)`}
        />
        <Stat
          icon="key"
          label="Échecs de connexion (24 h)"
          value={security.failed24h}
          tone={security.failed24h >= 10 ? "warn" : "default"}
          hint={
            <button type="button" className="font-semibold text-clay" onClick={() => onNavigate("sessions")}>
              Voir le journal →
            </button>
          }
        />
        <Stat
          icon="database"
          label="Dernière sauvegarde"
          value={lastBackup ? formatRelative(lastBackup.at) : "Aucune"}
          tone={!lastBackup || !lastBackup.ok ? "warn" : "ok"}
          hint={
            lastBackup
              ? lastBackup.ok
                ? `${bytes(lastBackup.bytes)} · ${lastBackup.trigger === "auto" ? "automatique" : lastBackup.trigger === "download" ? "téléchargée" : "manuelle"}`
                : `Échec : ${lastBackup.error}`
              : backups.schedule
                ? "Programmée chaque nuit"
                : "BACKUP_DB_MAIL non configurée"
          }
        />
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(420px,100%),1fr))] items-start gap-7">
        <AdminCard className="p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <AdminH2>Serveur</AdminH2>
            <RefreshButton onClick={reload} loading={loading} />
          </div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-5 gap-y-2 text-[13.5px]">
            <dt className="text-stone">Démarré</dt>
            <dd>
              {dateTime(server.startedAt)} <span className="text-stone">(depuis {duration(server.uptime)})</span>
            </dd>
            <dt className="text-stone">Node.js</dt>
            <dd>
              <Mono>{server.node}</Mono>
            </dd>
            <dt className="text-stone">Système</dt>
            <dd>
              <Mono>{server.platform}</Mono> · {server.system.cpus} processeur(s)
            </dd>
            <dt className="text-stone">Conteneur</dt>
            <dd>
              <Mono>{server.hostname}</Mono> · fuseau <Mono>{server.tz}</Mono>
            </dd>
            <dt className="text-stone">Mémoire</dt>
            <dd>
              {bytes(server.memory.rss)} utilisés par le site{" "}
              <span className="text-stone">
                (tas {bytes(server.memory.heapUsed)} / {bytes(server.memory.heapTotal)})
              </span>
            </dd>
            <dt className="text-stone">Machine</dt>
            <dd>
              {bytes(server.system.total - server.system.free)} / {bytes(server.system.total)} · charge{" "}
              {server.system.load.map((l) => l.toFixed(2)).join(" ")}
            </dd>
          </dl>
        </AdminCard>

        <AdminCard className="p-5">
          <AdminH2 className="mb-3">Base de données</AdminH2>
          <dl className="grid grid-cols-[auto_1fr] gap-x-5 gap-y-2 text-[13.5px]">
            <dt className="text-stone">Base</dt>
            <dd>
              <Mono>{database.name}</Mono> sur <Mono className="break-all">{database.host}</Mono>
            </dd>
            <dt className="text-stone">MongoDB</dt>
            <dd>
              {database.version ?? "?"} · ping {database.pingMs} ms
            </dd>
            <dt className="text-stone">Taille</dt>
            <dd>
              données {bytes(database.dataSize)} · disque {bytes(database.storageSize)} · index {bytes(database.indexSize)}
            </dd>
          </dl>
          <Table compact head={["Collection", "Documents", "Taille"]} className="mt-4">
            {database.collections.map((c) => (
              <tr key={c.name}>
                <td className={tdClass}>
                  <Mono>{c.name}</Mono>
                </td>
                <td className={tdClass}>{c.count.toLocaleString("fr-FR")}</td>
                <td className={tdClass}>{bytes(c.size)}</td>
              </tr>
            ))}
          </Table>
        </AdminCard>

        <AdminCard className="p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <AdminH2>Diagnostic</AdminH2>
            <RefreshButton onClick={checks.reload} loading={checks.loading} />
          </div>
          <ul className="flex flex-col">
            {checks.data?.map((c) => (
              <li key={c.label} className="flex items-start gap-3 border-b border-line py-2.5 text-[13.5px] last:border-0">
                <span
                  className={cn(
                    "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-[12px] font-bold",
                    c.ok ? "bg-moss-light text-moss" : "bg-wheat text-clay",
                  )}
                >
                  {c.ok ? "✓" : "!"}
                </span>
                <span className="min-w-0">
                  <span className="font-semibold">{c.label}</span>
                  <span className="block text-[12.5px] text-stone">{c.detail}</span>
                </span>
              </li>
            ))}
          </ul>
        </AdminCard>

        <AdminCard className="p-5">
          <AdminH2 className="mb-1">Configuration</AdminH2>
          <p className="mb-3 text-[13px] text-stone">
            Variables d'environnement du conteneur. Les secrets ne sont jamais affichés, seulement leur présence.
          </p>
          <Table compact head={["Variable", "Valeur"]}>
            {data.env.map((v) => (
              <tr key={v.name}>
                <td className={tdClass}>
                  <Mono>{v.name}</Mono>
                </td>
                <td className={cn(tdClass, "break-all")}>
                  {!v.set ? (
                    <span className="text-pebble">non définie</span>
                  ) : v.value === null ? (
                    <StatusBadge tone="sage">définie</StatusBadge>
                  ) : (
                    <Mono>{v.value}</Mono>
                  )}
                </td>
              </tr>
            ))}
          </Table>
        </AdminCard>

        <AdminCard className="p-5">
          <AdminH2 className="mb-3">Outils</AdminH2>
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <AdminLabel htmlFor="dev-mail">E-mail de test (Resend)</AdminLabel>
              <div className="flex flex-wrap gap-2.5">
                <input
                  id="dev-mail"
                  type="email"
                  placeholder="Vide : votre adresse"
                  value={mailTo}
                  onChange={(e) => setMailTo(e.target.value)}
                  className={cn(adminInputClass, "min-w-[200px] flex-1")}
                />
                <button
                  type="button"
                  disabled={!data.mail.enabled || busy === "mail"}
                  className={adminSecondaryButtonClass}
                  onClick={() =>
                    run("mail", async () => {
                      const r = await api.post<{ to: string; ms: number }>("/api/admin/dev/tools/test-mail", { to: mailTo });
                      toast.success(`E-mail accepté par Resend pour ${r.to} (${r.ms} ms).`);
                    })
                  }
                >
                  <Icon name="mail" size={16} />
                  {busy === "mail" ? "Envoi…" : "Envoyer"}
                </button>
              </div>
              <p className="text-[12.5px] text-stone">
                {data.mail.enabled
                  ? `Expéditeur ${data.mail.from} · demandes vers ${data.mail.notify ?? "personne (NOTIFY_EMAIL absente)"}`
                  : "RESEND_API_KEY absente : aucun e-mail ne part."}
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              <AdminLabel>Calendriers externes (iCal)</AdminLabel>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  disabled={busy === "ical"}
                  className={adminSecondaryButtonClass}
                  onClick={() =>
                    run("ical", async () => {
                      const { report } = await api.post<{ report: { ok: boolean }[] }>("/api/admin/dev/tools/ical-sync");
                      toast.success(`Synchronisation faite : ${report.filter((r) => r.ok).length}/${report.length} calendrier(s) lus.`);
                      reload();
                    })
                  }
                >
                  <Icon name="refresh" size={16} />
                  {busy === "ical" ? "Synchronisation…" : "Synchroniser maintenant"}
                </button>
                <span className="text-[12.5px] text-stone">
                  {data.ical ? `Dernière synchro ${formatRelative(data.ical.at)}` : "Jamais synchronisé"}
                </span>
              </div>
              {data.ical?.report
                .filter((r) => !r.ok)
                .map((r) => (
                  <p key={r.url} className="text-[12.5px] text-clay">
                    {r.url} : {r.error}
                  </p>
                ))}
            </div>
          </div>
        </AdminCard>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- maintenance & access

const accessModes: { id: AccessMode; title: string; text: string }[] = [
  { id: "normal", title: "Normal", text: "Chacun travaille selon son rôle." },
  {
    id: "readonly",
    title: "Lecture seule",
    text: "Les administrateurs et éditeurs voient tout mais ne peuvent plus rien modifier. Pour une migration ou une restauration.",
  },
  {
    id: "devOnly",
    title: "Réservé aux développeurs",
    text: "Les autres comptes sont déconnectés et ne peuvent plus se connecter. Pour reprendre la main si un compte a été piraté ou fait des dégâts.",
  },
];

/** "2026-11-13T18:30" for <input type="datetime-local">, in local time. */
const toLocalInput = (iso?: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

function AccessTab() {
  const confirm = useConfirm();
  const { data, reload } = useLoad<Overview>("/api/admin/dev/overview");
  const [form, setForm] = useState<{ enabled: boolean; message: Record<AdminLang, string>; until: string } | null>(null);
  const [lang, setLang] = useState<AdminLang>("fr");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!data) return;
    const m = data.maintenance;
    setForm({
      enabled: m.enabled,
      message: { fr: m.message?.fr ?? "", en: m.message?.en ?? "", de: m.message?.de ?? "" },
      until: toLocalInput(m.until),
    });
  }, [data]);

  if (!data || !form) return <p className="text-[14px] text-stone">Chargement…</p>;

  const saveMaintenance = async (next = form) => {
    setSaving(true);
    try {
      await api.put("/api/admin/dev/maintenance", { ...next, until: next.until ? new Date(next.until).toISOString() : null });
      toast.success(next.enabled ? "Site en maintenance : les visiteurs voient la page d'attente." : "Maintenance enregistrée.");
      reload();
      window.dispatchEvent(new Event(SYSTEM_STATUS_EVENT));
    } catch (e) {
      errorToast(e);
    } finally {
      setSaving(false);
    }
  };

  const toggleMaintenance = async (enabled: boolean) => {
    if (
      enabled &&
      !(await confirm({
        title: "Mettre le site en maintenance ?",
        message:
          "Les visiteurs verront une page d'attente (statut 503, les moteurs de recherche reviennent plus tard) et le formulaire de contact sera fermé. Les personnes connectées à l'administration voient toujours le site.",
        confirmLabel: "Mettre en maintenance",
        danger: true,
      }))
    )
      return;
    const next = { ...form, enabled };
    setForm(next);
    saveMaintenance(next);
  };

  const setAccess = async (mode: AccessMode) => {
    if (mode === data.adminAccess) return;
    if (
      mode !== "normal" &&
      !(await confirm({
        title: mode === "devOnly" ? "Réserver l'administration aux développeurs ?" : "Passer l'administration en lecture seule ?",
        message: accessModes.find((m) => m.id === mode)?.text,
        confirmLabel: "Confirmer",
        danger: mode === "devOnly",
      }))
    )
      return;
    try {
      await api.put("/api/admin/dev/access", { mode });
      toast.success("Accès mis à jour.");
      reload();
      window.dispatchEvent(new Event(SYSTEM_STATUS_EVENT));
    } catch (e) {
      errorToast(e);
    }
  };

  const revokeAll = async () => {
    if (
      !(await confirm({
        title: "Déconnecter tout le monde ?",
        message:
          "Toutes les sessions ouvertes, sauf celle-ci, sont fermées immédiatement, y compris les anciens cookies. Chacun devra se reconnecter avec son mot de passe.",
        confirmLabel: "Déconnecter tout le monde",
        danger: true,
      }))
    )
      return;
    try {
      const { closed } = await api.post<{ closed: number }>("/api/admin/dev/sessions/revoke-all");
      toast.success(`${closed} session(s) fermée(s).`);
      reload();
    } catch (e) {
      errorToast(e);
    }
  };

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(min(440px,100%),1fr))] items-start gap-7">
      <AdminCard className={cn("p-6", form.enabled && "border-clay")}>
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <AdminH2>Mode maintenance du site public</AdminH2>
            <p className="mt-1 text-[13px] text-stone">
              {data.maintenance.enabled && data.maintenance.at
                ? `Activé par ${data.maintenance.by} ${formatRelative(data.maintenance.at)}.`
                : "Remplace tout le site public par une page d'attente, dans la langue du visiteur."}
            </p>
          </div>
          <Toggle checked={form.enabled} onChange={toggleMaintenance} label="Mode maintenance" disabled={saving} />
        </div>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-3">
              <AdminLabel htmlFor="mt-msg">Message aux visiteurs</AdminLabel>
              <LangSwitch value={lang} onChange={setLang} />
            </div>
            <textarea
              id="mt-msg"
              rows={4}
              value={form.message[lang]}
              placeholder={lang === "fr" ? "Vide : message par défaut" : "Vide : message par défaut dans cette langue"}
              onChange={(e) => setForm({ ...form, message: { ...form.message, [lang]: e.target.value } })}
              className={adminInputClass}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <AdminLabel htmlFor="mt-until">Retour prévu (facultatif)</AdminLabel>
            <input
              id="mt-until"
              type="datetime-local"
              value={form.until}
              onChange={(e) => setForm({ ...form, until: e.target.value })}
              className={adminInputClass}
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="clay" size="pill" disabled={saving} onClick={() => saveMaintenance()}>
              {saving ? "Enregistrement…" : "Enregistrer le message"}
            </Button>
            <a href="/?maintenance=preview" target="_blank" rel="noreferrer" className={adminSecondaryButtonClass}>
              Aperçu de la page
            </a>
          </div>
        </div>
      </AdminCard>

      <div className="flex flex-col gap-7">
        <AdminCard className="p-6">
          <AdminH2 className="mb-1">Accès à l'administration</AdminH2>
          <p className="mb-4 text-[13px] text-stone">
            Les développeurs gardent toujours l'accès complet. Un bandeau prévient les autres comptes.
          </p>
          <div role="radiogroup" aria-label="Accès à l'administration" className="flex flex-col gap-2.5">
            {accessModes.map((m) => (
              <button
                key={m.id}
                type="button"
                role="radio"
                aria-checked={data.adminAccess === m.id}
                onClick={() => setAccess(m.id)}
                className={cn(
                  "flex items-start gap-3 rounded-xl border px-4 py-3 text-left transition-colors",
                  data.adminAccess === m.id ? "border-sage-dark bg-moss-light/50" : "border-line-strong hover:border-khaki",
                )}
              >
                <span
                  className={cn(
                    "mt-1 size-4 shrink-0 rounded-full border-2",
                    data.adminAccess === m.id ? "border-moss bg-moss shadow-[inset_0_0_0_2px_var(--color-cream)]" : "border-khaki",
                  )}
                />
                <span>
                  <span className="block text-[14px] font-semibold">{m.title}</span>
                  <span className="block text-[13px] text-stone">{m.text}</span>
                </span>
              </button>
            ))}
          </div>
        </AdminCard>

        <AdminCard className="p-6">
          <AdminH2 className="mb-1">Sessions</AdminH2>
          <p className="mb-4 text-[13px] text-stone">
            {data.security.activeSessions} session(s) ouverte(s). En cas de doute (mot de passe partagé, ordinateur perdu), déconnectez tout
            le monde puis changez les mots de passe concernés.
          </p>
          <button
            type="button"
            onClick={revokeAll}
            className={cn(adminSecondaryButtonClass, "border-clay text-clay hover:border-clay hover:text-[#8A3B22]")}
          >
            <Icon name="logout" size={16} />
            Déconnecter tout le monde
          </button>
        </AdminCard>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- sessions & sign-ins

function SessionsTab() {
  const confirm = useConfirm();
  const sessions = useLoad<Session[]>("/api/admin/dev/sessions");
  const [status, setStatus] = useState<"all" | "failed" | "ok">("all");
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const logins = useLoad<{ entries: LoginEntry[]; topFailedIps: { ip: string; count: number; last: string; emails: string[] }[] }>(
    `/api/admin/dev/logins?status=${status}&q=${encodeURIComponent(query)}`,
  );

  useEffect(() => {
    const t = setTimeout(() => setQuery(q), 350);
    return () => clearTimeout(t);
  }, [q]);

  const close = async (s: Session) => {
    if (
      !(await confirm({
        title: `Fermer cette session de ${s.user.name} ?`,
        message: `${device(s.ua).label} · ${s.ip}. La personne devra se reconnecter sur cet appareil.`,
        confirmLabel: "Fermer la session",
        danger: true,
      }))
    )
      return;
    try {
      await api.delete(`/api/admin/dev/sessions/${encodeURIComponent(s.id)}`);
      toast.success("Session fermée.");
      sessions.reload();
    } catch (e) {
      errorToast(e);
    }
  };

  return (
    <div className="flex flex-col gap-7">
      <AdminCard className="p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <AdminH2>Sessions ouvertes ({sessions.data?.length ?? "…"})</AdminH2>
          <RefreshButton onClick={sessions.reload} loading={sessions.loading} />
        </div>
        <Table head={["Compte", "Appareil", "Adresse IP", "Ouverte", "Dernière activité", "Expire", ""]}>
          {sessions.data?.map((s) => {
            const d = device(s.ua);
            return (
              <tr key={s.id}>
                <td className={tdClass}>
                  <span className="font-semibold">{s.user.name}</span>
                  {s.current && (
                    <StatusBadge tone="sage" className="ml-2">
                      Vous
                    </StatusBadge>
                  )}
                  <span className="block text-[12px] text-stone">
                    {s.user.email} · {roleLabels[s.user.role]}
                  </span>
                </td>
                <td className={tdClass} title={s.ua}>
                  {d.label}
                  {d.mobile && <span className="text-stone"> (mobile)</span>}
                </td>
                <td className={tdClass}>
                  <Mono>{s.ip}</Mono>
                </td>
                <td className={tdClass}>{dateTime(s.createdAt)}</td>
                <td className={tdClass}>{formatRelative(s.lastSeenAt)}</td>
                <td className={tdClass}>
                  {dateTime(s.expiresAt)}
                  {s.remember && <span className="block text-[12px] text-stone">« se souvenir de moi »</span>}
                </td>
                <td className={cn(tdClass, "text-right")}>
                  {!s.current && (
                    <button type="button" onClick={() => close(s)} className="text-[13px] font-semibold text-clay hover:text-[#8A3B22]">
                      Fermer
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </Table>
        {sessions.data?.length === 0 && <p className="py-3 text-[13px] text-stone">Aucune session enregistrée.</p>}
        <p className="mt-3 text-[12.5px] text-stone">
          Les sessions ouvertes avant la mise en place de ce suivi n'apparaissent pas ; « Déconnecter tout le monde » les ferme aussi.
        </p>
      </AdminCard>

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-7 xl:grid-cols-[minmax(0,1fr)_300px]">
        <AdminCard className="p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <AdminH2>Journal des connexions</AdminH2>
            <div className="flex flex-wrap items-center gap-2.5">
              <input
                type="search"
                placeholder="E-mail, nom ou IP"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className={cn(adminInputClass, "w-[200px] py-2 text-[13.5px]")}
              />
              <PillTabs
                label="Filtrer"
                value={status}
                onChange={setStatus}
                items={[
                  { id: "all", label: "Toutes" },
                  { id: "ok", label: "Réussies" },
                  { id: "failed", label: "Échouées" },
                ]}
              />
            </div>
          </div>
          <Table head={["Date", "Compte", "Résultat", "Appareil", "Adresse IP"]}>
            {logins.data?.entries.map((e) => (
              <tr key={e.id}>
                <td className={cn(tdClass, "whitespace-nowrap")}>{dateTime(e.at)}</td>
                <td className={tdClass}>
                  {e.name && <span className="font-semibold">{e.name} </span>}
                  <span className={e.name ? "block text-[12px] text-stone" : undefined}>{e.email || "—"}</span>
                </td>
                <td className={tdClass}>
                  <StatusBadge tone={e.ok ? "sage" : "wheat"}>{e.ok ? "Réussie" : "Refusée"}</StatusBadge>
                  <span className="block pt-1 text-[12px] text-stone">{reasonLabels[e.reason] ?? e.reason}</span>
                </td>
                <td className={tdClass} title={e.ua}>
                  {device(e.ua).label}
                </td>
                <td className={tdClass}>
                  <button
                    type="button"
                    className="font-mono text-[12.5px] text-olive hover:text-clay"
                    title="Filtrer sur cette adresse"
                    onClick={() => setQ(e.ip)}
                  >
                    {e.ip}
                  </button>
                </td>
              </tr>
            ))}
          </Table>
          {logins.data?.entries.length === 0 && <p className="py-3 text-[13px] text-stone">Aucune connexion pour ce filtre.</p>}
          <p className="mt-3 text-[12.5px] text-stone">Conservé 6 mois. Les connexions par lien de réinitialisation apparaissent aussi.</p>
        </AdminCard>

        <AdminCard className="p-5">
          <AdminH2 className="mb-1">Échecs par adresse (7 j)</AdminH2>
          <p className="mb-3 text-[12.5px] text-stone">10 essais par quart d'heure et par adresse au maximum.</p>
          {logins.data?.topFailedIps.length ? (
            <ul className="flex flex-col">
              {logins.data.topFailedIps.map((t) => (
                <li key={t.ip} className="border-b border-line py-2.5 last:border-0">
                  <div className="flex items-center justify-between gap-2">
                    <button type="button" className="font-mono text-[12.5px] text-olive hover:text-clay" onClick={() => setQ(t.ip)}>
                      {t.ip}
                    </button>
                    <StatusBadge tone={t.count >= 10 ? "wheat" : "muted"}>{t.count}</StatusBadge>
                  </div>
                  <p className="mt-0.5 truncate text-[12px] text-stone" title={t.emails.join(", ")}>
                    {t.emails.join(", ")} · {formatRelative(t.last)}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[13px] text-stone">Aucun échec récent.</p>
          )}
        </AdminCard>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- emergency account tools

function AccountsTab() {
  const confirm = useConfirm();
  const { user: me } = useAuth();
  const { data, reload } = useLoad<DevUser[]>("/api/admin/dev/users");
  const [link, setLink] = useState<{ name: string; link: string; expires: string } | null>(null);

  const act = async (fn: () => Promise<unknown>, success: string) => {
    try {
      await fn();
      toast.success(success);
      reload();
    } catch (e) {
      errorToast(e);
    }
  };

  const suspend = async (u: DevUser) => {
    if (
      !u.disabled &&
      !(await confirm({
        title: `Suspendre le compte de ${u.name} ?`,
        message: "Ses sessions sont fermées et la connexion est refusée tant que le compte n'est pas réactivé. Rien n'est supprimé.",
        confirmLabel: "Suspendre",
        danger: true,
      }))
    )
      return;
    act(
      () => api.post(`/api/admin/dev/users/${u.id}/disable`, { disabled: !u.disabled }),
      u.disabled ? "Compte réactivé." : "Compte suspendu.",
    );
  };

  const resetLink = async (u: DevUser) => {
    try {
      const r = await api.post<{ link: string; expires: string }>(`/api/admin/dev/users/${u.id}/reset-link`);
      setLink({ name: u.name, ...r });
    } catch (e) {
      errorToast(e);
    }
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Lien copié.");
    } catch {
      toast.error("Copie impossible : sélectionnez le lien à la main.");
    }
  };

  return (
    <div className="flex flex-col gap-7">
      {link && (
        <AdminCard className="border-sage-dark p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <AdminH2>Lien de réinitialisation pour {link.name}</AdminH2>
              <p className="mt-1 text-[13px] text-stone">
                Valable une fois, jusqu'au {dateTime(link.expires)}. À transmettre par SMS ou téléphone : il permet de choisir un nouveau
                mot de passe sans accès à la boîte mail.
              </p>
            </div>
            <button type="button" onClick={() => setLink(null)} className="text-[13px] font-semibold text-umber hover:text-ink">
              Fermer
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2.5">
            <input
              readOnly
              value={link.link}
              onFocus={(e) => e.target.select()}
              className={cn(adminInputClass, "min-w-[240px] flex-1 font-mono text-[12.5px]")}
            />
            <Button variant="clay" size="pill" onClick={() => copy(link.link)}>
              Copier
            </Button>
          </div>
        </AdminCard>
      )}

      <AdminCard className="p-5">
        <div className="mb-1 flex items-center justify-between gap-3">
          <AdminH2>Comptes</AdminH2>
          <Link to="/admin/utilisateurs" className="text-[13px] font-semibold text-clay">
            Modifier nom, e-mail, rôle →
          </Link>
        </div>
        <p className="mb-3 text-[13px] text-stone">
          Pour reprendre la main : suspendre un compte, fermer ses sessions, ou créer un lien de réinitialisation sans passer par l'e-mail.
        </p>
        <Table head={["Compte", "État", "Dernière connexion", "Sessions", "Actions"]}>
          {data?.map((u) => {
            const self = u.id === me?.id;
            return (
              <tr key={u.id}>
                <td className={tdClass}>
                  <span className="font-semibold">{u.name}</span>
                  {self && <span className="text-stone"> (vous)</span>}
                  <span className="block text-[12px] text-stone">
                    {u.email} · {roleLabels[u.role]}
                  </span>
                </td>
                <td className={tdClass}>
                  {u.disabled ? (
                    <StatusBadge tone="wheat">Suspendu</StatusBadge>
                  ) : u.pending ? (
                    <StatusBadge tone="muted">Invitation</StatusBadge>
                  ) : (
                    <StatusBadge tone="sage">Actif</StatusBadge>
                  )}
                </td>
                <td className={tdClass}>
                  {u.lastSignIn ? (
                    <>
                      {formatRelative(u.lastSignIn.at)}
                      <span className="block text-[12px] text-stone">
                        {device(u.lastSignIn.ua).label} · <Mono className="text-[12px]">{u.lastSignIn.ip}</Mono>
                      </span>
                    </>
                  ) : u.lastLoginAt ? (
                    formatRelative(u.lastLoginAt)
                  ) : (
                    <span className="text-pebble">jamais</span>
                  )}
                </td>
                <td className={tdClass}>{u.sessions}</td>
                <td className={tdClass}>
                  <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[13px] font-semibold">
                    <button type="button" className="text-umber hover:text-ink" onClick={() => resetLink(u)}>
                      Lien de réinitialisation
                    </button>
                    {(u.sessions > 0 || !self) && (
                      <button
                        type="button"
                        className="text-umber hover:text-ink"
                        onClick={() =>
                          act(
                            () => api.post(`/api/admin/dev/users/${u.id}/revoke-sessions`),
                            self ? "Vos autres sessions sont fermées." : `${u.name} est déconnecté(e) partout.`,
                          )
                        }
                      >
                        {self ? "Fermer mes autres sessions" : "Déconnecter"}
                      </button>
                    )}
                    {!self && (
                      <button
                        type="button"
                        className={u.disabled ? "text-moss hover:text-forest" : "text-clay hover:text-[#8A3B22]"}
                        onClick={() => suspend(u)}
                      >
                        {u.disabled ? "Réactiver" : "Suspendre"}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </Table>
      </AdminCard>

      <AdminCard className="p-5">
        <AdminH2 className="mb-2">Si plus personne ne peut se connecter</AdminH2>
        <p className="mb-3 text-[13px] text-stone">
          Depuis le serveur (Dokploy › terminal du conteneur, ou SSH), crée le compte ou remet son mot de passe et le réactive :
        </p>
        <pre className="overflow-x-auto rounded-xl bg-ink px-4 py-3 font-mono text-[12.5px] leading-relaxed text-cream">
          docker compose exec site node src/create-user.js moi@exemple.fr "mot-de-passe-long" "Prénom Nom" developer
        </pre>
      </AdminCard>
    </div>
  );
}

// ---------------------------------------------------------------- backups

const triggerLabels: Record<BackupEntry["trigger"], string> = {
  auto: "Automatique",
  manual: "Manuelle",
  download: "Téléchargement",
  "restore-point": "Point de restauration",
};
const kindLabels: Record<BackupEntry["kind"], string> = { data: "données", photos: "photos", full: "données + photos" };

function BackupsTab() {
  const confirm = useConfirm();
  const { data, reload } = useLoad<{
    mailEnabled: boolean;
    schedule: BackupSchedule | null;
    history: BackupEntry[];
    restorePoints: RestorePoint[];
  }>("/api/admin/dev/backups");
  const [busy, setBusy] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [keepUsers, setKeepUsers] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    try {
      await fn();
    } catch (e) {
      errorToast(e);
    } finally {
      setBusy(null);
    }
  };

  const pick = (f: File | null) => {
    setFile(f);
    setInspection(null);
    if (!f) return;
    run("inspect", async () => {
      const form = new FormData();
      form.append("file", f);
      setInspection(await api.post<Inspection>("/api/admin/dev/backups/inspect", form));
    });
  };

  const restore = async () => {
    if (!file || !inspection) return;
    const replaced = inspection.collections.filter((c) => !c.skipped && c.mode === "replace" && !(keepUsers && c.name === "users"));
    if (
      !(await confirm({
        title: `Restaurer ${file.name} ?`,
        message: `${replaced.length} collection(s) seront remplacées par le contenu du fichier${inspection.collections.some((c) => c.mode === "merge") ? ", les photos du fichier seront ajoutées" : ""}. Un point de restauration des données actuelles est créé juste avant : vous pourrez revenir en arrière.`,
        confirmLabel: "Restaurer",
        danger: true,
      }))
    )
      return;
    run("restore", async () => {
      const form = new FormData();
      form.append("keepUsers", String(keepUsers));
      form.append("file", file);
      await api.post("/api/admin/dev/backups/restore", form);
      toast.success("Sauvegarde restaurée. Un point de restauration a été créé juste avant.");
      setFile(null);
      setInspection(null);
      if (fileRef.current) fileRef.current.value = "";
      reload();
    });
  };

  const restorePoint = async (p: RestorePoint) => {
    if (
      !(await confirm({
        title: "Revenir à ce point de restauration ?",
        message: `Les données (hors photos et comptes) reviennent à l'état du ${dateTime(p.at)}. L'état actuel est d'abord gardé dans un nouveau point.`,
        confirmLabel: "Revenir à ce point",
        danger: true,
      }))
    )
      return;
    run(`rp-${p.id}`, async () => {
      await api.post(`/api/admin/dev/restore-points/${p.id}/restore`, { keepUsers: true });
      toast.success("Données rétablies.");
      reload();
    });
  };

  const removePoint = async (p: RestorePoint) => {
    if (
      !(await confirm({
        title: "Supprimer ce point de restauration ?",
        message: "C'est définitif.",
        confirmLabel: "Supprimer",
        danger: true,
      }))
    )
      return;
    run(`rp-${p.id}`, async () => {
      await api.delete(`/api/admin/dev/restore-points/${p.id}`);
      reload();
    });
  };

  if (!data) return <p className="text-[14px] text-stone">Chargement…</p>;

  return (
    <div className="flex flex-col gap-7">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(380px,100%),1fr))] items-start gap-7">
        <AdminCard className="p-6">
          <AdminH2 className="mb-1">Sauvegarde automatique</AdminH2>
          {data.schedule ? (
            <p className="text-[13.5px] text-umber">
              Chaque nuit après {data.schedule.hour} h vers <strong>{data.schedule.to}</strong>, photos le lundi.
              <span className="mt-1 block text-[13px] text-stone">
                Dernière : {data.schedule.lastDate ?? "jamais"} · photos : {data.schedule.photosDate ?? "jamais"}
                {!data.mailEnabled && " · RESEND_API_KEY absente, rien ne part !"}
              </span>
            </p>
          ) : (
            <p className="text-[13.5px] text-clay">Désactivée : définir BACKUP_DB_MAIL (et RESEND_API_KEY) dans l'environnement.</p>
          )}
          <div className="mt-5 flex flex-col gap-1.5">
            <AdminLabel>Envoyer maintenant par e-mail</AdminLabel>
            <div className="flex flex-wrap gap-2.5">
              {(["data", "full"] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  disabled={!data.mailEnabled || busy !== null}
                  className={adminSecondaryButtonClass}
                  onClick={() =>
                    run(`send-${k}`, async () => {
                      const r = await api.post<{ to: string }>("/api/admin/dev/backups/send", { photos: k === "full" });
                      toast.success(`Sauvegarde envoyée à ${r.to}.`);
                      reload();
                    })
                  }
                >
                  <Icon name="mail" size={16} />
                  {busy === `send-${k}` ? "Envoi…" : k === "data" ? "Données" : "Données + photos"}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-5 flex flex-col gap-1.5">
            <AdminLabel>Télécharger</AdminLabel>
            <div className="flex flex-wrap gap-2.5">
              {(["data", "photos", "full"] as const).map((k) => (
                <a
                  key={k}
                  href={`/api/admin/dev/backups/download?kind=${k}`}
                  className={adminSecondaryButtonClass}
                  onClick={() => setTimeout(reload, 3000)}
                >
                  <Icon name="download" size={16} />
                  {{ data: "Données", photos: "Photos", full: "Tout" }[k]}
                </a>
              ))}
            </div>
            <p className="text-[12.5px] text-stone">Fichiers .json.gz, à restaurer ci-contre ou avec node src/restore.js.</p>
          </div>
        </AdminCard>

        <AdminCard className="p-6">
          <AdminH2 className="mb-1">Restaurer une sauvegarde</AdminH2>
          <p className="mb-4 text-[13px] text-stone">
            Un fichier reçu par e-mail ou téléchargé ici. Rien n'est modifié avant votre confirmation.
          </p>
          <label
            className={cn(
              "flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-khaki bg-parchment px-4 py-6 text-center text-[13.5px] text-umber transition-colors hover:border-sage-dark",
              busy === "inspect" && "opacity-60",
            )}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              pick(e.dataTransfer.files[0] ?? null);
            }}
          >
            <Icon name="upload" size={22} />
            {file ? (
              <span className="font-semibold">{file.name}</span>
            ) : (
              <span>Glisser un fichier .json.gz ici, ou cliquer pour choisir</span>
            )}
            {busy === "inspect" && <span className="text-[12.5px] text-stone">Lecture du fichier…</span>}
            <input
              ref={fileRef}
              type="file"
              accept=".gz,.json,application/gzip,application/json"
              className="sr-only"
              onChange={(e) => pick(e.target.files?.[0] ?? null)}
            />
          </label>

          {inspection && (
            <div className="mt-4 flex flex-col gap-3">
              <p className="text-[13px] text-umber">
                {inspection.meta?.createdAt ? (
                  <>
                    Sauvegarde du <strong>{dateTime(inspection.meta.createdAt)}</strong> ({inspection.meta.site}, base {inspection.meta.db})
                  </>
                ) : (
                  "Sauvegarde sans date (ancien format)"
                )}{" "}
                · {bytes(inspection.bytes)}
              </p>
              <Table compact head={["Collection", "Dans le fichier", "Actuellement", "Effet"]}>
                {inspection.collections.map((c) => {
                  const skipped = c.skipped || (keepUsers && c.name === "users");
                  return (
                    <tr key={c.name} className={skipped ? "opacity-50" : undefined}>
                      <td className={tdClass}>
                        <Mono>{c.name}</Mono>
                      </td>
                      <td className={tdClass}>{c.count}</td>
                      <td className={tdClass}>{c.current}</td>
                      <td className={tdClass}>{skipped ? "ignorée" : c.mode === "merge" ? "ajout / mise à jour" : "remplacée"}</td>
                    </tr>
                  );
                })}
              </Table>
              <label className="flex items-start gap-2.5 text-[13.5px]">
                <input
                  type="checkbox"
                  checked={keepUsers}
                  onChange={(e) => setKeepUsers(e.target.checked)}
                  className="mt-1 accent-[var(--color-moss)]"
                />
                <span>
                  Garder les comptes actuels
                  <span className="block text-[12.5px] text-stone">
                    Décocher remet aussi les comptes et mots de passe du fichier : vous pourriez être déconnecté.
                  </span>
                </span>
              </label>
              <Button variant="clay" size="pill" className="self-start" disabled={busy === "restore"} onClick={restore}>
                {busy === "restore" ? "Restauration…" : "Restaurer"}
              </Button>
            </div>
          )}
        </AdminCard>
      </div>

      <AdminCard className="p-5">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
          <AdminH2>Points de restauration</AdminH2>
          <button
            type="button"
            disabled={busy !== null}
            className={adminSecondaryButtonClass}
            onClick={() =>
              run("rp-new", async () => {
                await api.post("/api/admin/dev/restore-points", {});
                toast.success("Point de restauration créé.");
                reload();
              })
            }
          >
            {busy === "rp-new" ? "Création…" : "Créer un point maintenant"}
          </button>
        </div>
        <p className="mb-3 text-[13px] text-stone">
          Copie des données (sans les photos) gardée dans la base, prise automatiquement avant chaque restauration. Les 10 derniers sont
          conservés.
        </p>
        <Table head={["Date", "Motif", "Taille", ""]}>
          {data.restorePoints.map((p) => (
            <tr key={p.id}>
              <td className={cn(tdClass, "whitespace-nowrap")}>{dateTime(p.at)}</td>
              <td className={tdClass}>
                {p.label}
                {p.by && <span className="block text-[12px] text-stone">par {p.by}</span>}
              </td>
              <td className={tdClass}>{bytes(p.bytes)}</td>
              <td className={cn(tdClass, "text-right")}>
                <div className="flex flex-wrap justify-end gap-x-4 gap-y-1 text-[13px] font-semibold">
                  <a href={`/api/admin/dev/restore-points/${p.id}/download`} className="text-umber hover:text-ink">
                    Télécharger
                  </a>
                  <button type="button" disabled={busy !== null} className="text-umber hover:text-ink" onClick={() => restorePoint(p)}>
                    Revenir à ce point
                  </button>
                  <button type="button" disabled={busy !== null} className="text-clay hover:text-[#8A3B22]" onClick={() => removePoint(p)}>
                    Supprimer
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </Table>
        {data.restorePoints.length === 0 && <p className="py-3 text-[13px] text-stone">Aucun point de restauration.</p>}
      </AdminCard>

      <AdminCard className="p-5">
        <AdminH2 className="mb-3">Historique</AdminH2>
        <Table head={["Date", "Type", "Contenu", "Destination", "Résultat"]}>
          {data.history.map((b) => (
            <tr key={b.id}>
              <td className={cn(tdClass, "whitespace-nowrap")}>{dateTime(b.at)}</td>
              <td className={tdClass}>
                {triggerLabels[b.trigger]}
                {b.by && <span className="block text-[12px] text-stone">par {b.by}</span>}
              </td>
              <td className={tdClass}>
                {kindLabels[b.kind]}
                {b.counts && (
                  <span className="block text-[12px] text-stone">{Object.values(b.counts).reduce((s, n) => s + n, 0)} documents</span>
                )}
              </td>
              <td className={tdClass}>
                {b.trigger === "download" ? "navigateur" : b.trigger === "restore-point" ? "base (GridFS)" : b.to}
              </td>
              <td className={tdClass}>
                {b.ok ? <StatusBadge tone="sage">{bytes(b.bytes)}</StatusBadge> : <StatusBadge tone="wheat">Échec</StatusBadge>}
                {b.error && <span className="block pt-1 text-[12px] text-clay">{b.error}</span>}
                {b.parts ? <span className="block pt-1 text-[12px] text-stone">+ {b.parts} e-mail(s) de photos</span> : null}
              </td>
            </tr>
          ))}
        </Table>
        {data.history.length === 0 && <p className="py-3 text-[13px] text-stone">Aucune sauvegarde pour l'instant.</p>}
      </AdminCard>
    </div>
  );
}

// ---------------------------------------------------------------- server log

function LogsTab() {
  const [lines, setLines] = useState<LogLine[]>([]);
  const [level, setLevel] = useState<"all" | "warn" | "error">("all");
  const [live, setLive] = useState(true);
  const [filter, setFilter] = useState("");
  const boxRef = useRef<HTMLDivElement>(null);
  const lastId = useRef(0);

  const fetchLines = useCallback(async (reset = false) => {
    try {
      const after = reset ? 0 : lastId.current;
      const fresh = await api.get<LogLine[]>(`/api/admin/dev/logs?after=${after}`);
      if (fresh.length) lastId.current = fresh[fresh.length - 1].id;
      setLines((prev) => (reset ? fresh : [...prev, ...fresh].slice(-800)));
    } catch (e) {
      errorToast(e);
    }
  }, []);

  useEffect(() => {
    fetchLines(true);
  }, [fetchLines]);

  useEffect(() => {
    if (!live) return;
    const t = setInterval(() => fetchLines(), 4000);
    return () => clearInterval(t);
  }, [live, fetchLines]);

  const shown = lines.filter(
    (l) =>
      (level === "all" || (level === "warn" ? l.level !== "log" : l.level === "error")) &&
      (!filter || l.text.toLowerCase().includes(filter.toLowerCase())),
  );

  useEffect(() => {
    const box = boxRef.current;
    if (box && live) box.scrollTop = box.scrollHeight;
  }, [shown.length, live]);

  const copy = () =>
    navigator.clipboard
      .writeText(shown.map((l) => `${l.at} [${l.level}] ${l.text}`).join("\n"))
      .then(() => toast.success(`${shown.length} ligne(s) copiée(s).`))
      .catch(() => toast.error("Copie impossible."));

  return (
    <AdminCard className="p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <AdminH2>Journal du serveur</AdminH2>
          <p className="text-[12.5px] text-stone">
            Les 800 dernières lignes depuis le démarrage du conteneur (base, e-mails, iCal, sauvegardes, erreurs).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="search"
            placeholder="Filtrer"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className={cn(adminInputClass, "w-[160px] py-2 text-[13.5px]")}
          />
          <PillTabs
            label="Niveau"
            value={level}
            onChange={setLevel}
            items={[
              { id: "all", label: "Tout" },
              { id: "warn", label: "Alertes" },
              { id: "error", label: "Erreurs" },
            ]}
          />
          <label className="flex items-center gap-2 text-[13px] font-semibold text-umber">
            <Toggle checked={live} onChange={setLive} label="Suivi en direct" />
            Direct
          </label>
          <button type="button" onClick={copy} className="text-[13px] font-semibold text-umber hover:text-ink">
            Copier
          </button>
        </div>
      </div>
      <div ref={boxRef} className="h-[min(62vh,640px)] overflow-auto rounded-xl bg-ink p-4 font-mono text-[12px] leading-[1.55]">
        {shown.length === 0 && <p className="text-pebble">Aucune ligne.</p>}
        {shown.map((l) => (
          <div key={l.id} className="flex gap-3 whitespace-pre-wrap break-all">
            <span className="shrink-0 text-[#8A8470]">{new Date(l.at).toLocaleTimeString("fr-FR")}</span>
            <span
              className={cn(
                "shrink-0 font-semibold uppercase",
                l.level === "error" ? "text-[#F08E6A]" : l.level === "warn" ? "text-wheat-light" : "text-sage",
              )}
            >
              {l.level.padEnd(5)}
            </span>
            <span className={l.level === "error" ? "text-[#F6C7B4]" : "text-cream"}>{l.text}</span>
          </div>
        ))}
      </div>
    </AdminCard>
  );
}

// ---------------------------------------------------------------- page

const tabs = [
  { id: "overview", label: "Vue d'ensemble" },
  { id: "access", label: "Maintenance & accès" },
  { id: "sessions", label: "Connexions" },
  { id: "accounts", label: "Comptes" },
  { id: "backups", label: "Sauvegardes" },
  { id: "logs", label: "Journal serveur" },
] as const;
type Tab = (typeof tabs)[number]["id"];

export function AdminDev() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const tab = (tabs.find((t) => t.id === params.get("onglet"))?.id ?? "overview") as Tab;
  const setTab = (id: Tab) => setParams(id === "overview" ? {} : { onglet: id }, { replace: true });

  if (!isDeveloper(user)) return <Navigate to="/admin" replace />;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-ink px-5 py-4 text-cream">
        <span className="flex size-10 items-center justify-center rounded-xl bg-charcoal text-sage">
          <Icon name="terminal" size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-serif text-[17px]">Espace développeur</p>
          <p className="text-[13px] text-[#B7AE93]">
            État du serveur, connexions, sauvegardes et outils de secours. Chaque action sensible apparaît dans l'activité du tableau de
            bord.
          </p>
        </div>
      </div>
      <PillTabs label="Sections de l'espace développeur" items={[...tabs]} value={tab} onChange={setTab} />
      {tab === "overview" && <OverviewTab onNavigate={setTab} />}
      {tab === "access" && <AccessTab />}
      {tab === "sessions" && <SessionsTab />}
      {tab === "accounts" && <AccountsTab />}
      {tab === "backups" && <BackupsTab />}
      {tab === "logs" && <LogsTab />}
    </div>
  );
}
