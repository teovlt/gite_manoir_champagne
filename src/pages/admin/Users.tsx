import { useCallback, useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AdminCard, AdminH2, AdminLabel, Icon, StatusBadge, adminInputClass, adminSecondaryButtonClass } from "@/components/admin/admin-ui";
import { useAuth } from "@/providers/auth-provider";
import { api } from "@/lib/api";
import { formatRelative, initials } from "@/lib/format";
import type { AdminUser } from "@/lib/types";
import { isAdmin, isDeveloper, roleLabels } from "@/lib/roles";
import { useConfirm } from "@/components/admin/confirm-dialog";

const emptyDraft = { name: "", email: "", role: "editor" as AdminUser["role"], password: "" };

interface EditorProps {
  user: AdminUser;
  isMe: boolean;
  /** The signed-in user is a developer: can give the developer role. */
  canGrantDev: boolean;
  mailEnabled: boolean;
  onSaved: (u: AdminUser) => void;
  onClose: () => void;
  onRemove: () => void;
}

/** Everything an administrator can change on an account. */
function UserEditor({ user, isMe, canGrantDev, mailEnabled, onSaved, onClose, onRemove }: EditorProps) {
  const [form, setForm] = useState({ name: user.name, email: user.email, role: user.role, password: "" });
  const [busy, setBusy] = useState<"save" | "link" | null>(null);
  const id = (k: string) => `edit-${user.id}-${k}`;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy("save");
    try {
      const updated = await api.patch<AdminUser>(`/api/admin/users/${user.id}`, {
        name: form.name,
        email: form.email,
        role: form.role,
        ...(form.password && { password: form.password }),
      });
      toast.success(form.password && !isMe ? `Compte mis à jour — les sessions de ${updated.name} sont déconnectées.` : "Compte mis à jour.");
      onSaved(updated);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const sendLink = async () => {
    setBusy("link");
    try {
      const { invitation } = await api.post<{ invitation: boolean }>(`/api/admin/users/${user.id}/send-link`);
      toast.success(invitation ? `Nouvelle invitation envoyée à ${user.email}.` : `Lien de réinitialisation envoyé à ${user.email}.`);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <form onSubmit={save} className="mt-4 grid w-full gap-4 rounded-xl bg-parchment p-4 sm:grid-cols-2">
      <div className="flex flex-col gap-1.5">
        <AdminLabel htmlFor={id("name")}>Prénom et nom</AdminLabel>
        <input id={id("name")} required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={adminInputClass} />
      </div>
      <div className="flex flex-col gap-1.5">
        <AdminLabel htmlFor={id("email")}>E-mail de connexion</AdminLabel>
        <input id={id("email")} type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={adminInputClass} />
      </div>
      <div className="flex flex-col gap-1.5">
        <AdminLabel htmlFor={id("role")}>Rôle</AdminLabel>
        <select
          id={id("role")}
          value={form.role}
          disabled={isMe}
          onChange={(e) => setForm({ ...form, role: e.target.value as AdminUser["role"] })}
          className={adminInputClass}
        >
          {canGrantDev && <option value="developer">Développeur</option>}
          <option value="admin">Administrateur</option>
          <option value="editor">Éditeur</option>
        </select>
        {isMe && <p className="text-[13px] text-stone">Un autre administrateur doit changer votre rôle.</p>}
      </div>
      <div className="flex flex-col gap-1.5">
        <AdminLabel htmlFor={id("pass")}>Nouveau mot de passe (facultatif)</AdminLabel>
        <input
          id={id("pass")}
          type="text"
          minLength={10}
          autoComplete="off"
          placeholder="Laisser vide pour ne pas changer"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          className={adminInputClass}
        />
      </div>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <Button type="submit" variant="clay" size="pill" disabled={busy === "save"}>
          {busy === "save" ? "Enregistrement…" : "Enregistrer"}
        </Button>
        {mailEnabled && (
          <button type="button" onClick={sendLink} disabled={busy === "link"} className={adminSecondaryButtonClass}>
            <Icon name="mail" size={16} />
            {busy === "link" ? "Envoi…" : user.pending ? "Renvoyer l'invitation" : "Envoyer un lien de réinitialisation"}
          </button>
        )}
        <button type="button" onClick={onClose} className="text-[13px] font-semibold text-umber hover:text-ink">
          Annuler
        </button>
        {!isMe && (
          <button type="button" onClick={onRemove} className="ml-auto inline-flex items-center gap-1.5 text-[13px] font-semibold text-clay hover:text-[#8A3B22]">
            <Icon name="trash" size={15} strokeWidth={2} />
            Supprimer le compte
          </button>
        )}
      </div>
    </form>
  );
}

export function AdminUsers() {
  const confirm = useConfirm();
  const { user: me, setUser: setMe } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [mailEnabled, setMailEnabled] = useState(false);
  const [draft, setDraft] = useState(emptyDraft);
  const [saving, setSaving] = useState(false);
  const allowed = isAdmin(me);

  const load = useCallback(async () => {
    try {
      setUsers(await api.get<AdminUser[]>("/api/admin/users"));
    } catch (e) {
      toast.error((e as Error).message);
    }
  }, []);
  useEffect(() => {
    if (!allowed) return;
    load();
    api
      .get<{ enabled: boolean }>("/api/admin/mail-status")
      .then((r) => setMailEnabled(r.enabled))
      .catch(() => {});
  }, [load, allowed]);

  if (!allowed || !me) return <Navigate to="/admin" replace />;
  const meDev = isDeveloper(me);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/api/admin/users", draft);
      toast.success(draft.password ? "Compte créé. Communiquez le mot de passe provisoire à la personne." : "Invitation envoyée par e-mail.");
      setDraft(emptyDraft);
      load();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const saved = (u: AdminUser) => {
    if (u.id === me.id) setMe(u);
    setEditing(null);
    load();
  };

  const remove = async (u: AdminUser) => {
    if (!(await confirm({ title: `Supprimer le compte de ${u.name} ?`, message: "Cette personne n'aura plus accès à l'administration. C'est définitif.", confirmLabel: "Supprimer le compte", danger: true }))) return;
    try {
      await api.delete(`/api/admin/users/${u.id}`);
      toast.success("Compte supprimé.");
      setEditing(null);
      load();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(min(440px,100%),1fr))] items-start gap-7">
      <div>
        <AdminH2 className="mb-4">Comptes ({users.length})</AdminH2>
        <AdminCard className="px-5 py-1.5">
          {users.map((u, i) => (
            <div key={u.id} className={i < users.length - 1 ? "border-b border-line py-4" : "py-4"}>
              <div className="flex flex-wrap items-center gap-3.5">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-clay text-[13px] font-semibold text-cream">{initials(u.name)}</span>
                <div className="min-w-[180px] flex-1">
                  <p className="text-[14px] font-semibold">
                    {u.name} {u.id === me.id && <span className="text-[13px] font-normal text-stone">(vous)</span>}
                  </p>
                  <p className="text-[13px] text-stone">
                    {u.email} · {u.pending ? "invitation en attente" : u.lastLoginAt ? `connecté ${formatRelative(u.lastLoginAt)}` : "jamais connecté"}
                  </p>
                  {u.pendingEmail && <p className="text-[13px] text-rust">Nouvelle adresse à confirmer : {u.pendingEmail}</p>}
                </div>
                {u.disabled && <StatusBadge tone="wheat">Suspendu</StatusBadge>}
                <StatusBadge tone={u.role === "editor" ? "muted" : "sage"} className={u.role === "developer" ? "bg-ink text-cream" : undefined}>
                  {roleLabels[u.role]}
                </StatusBadge>
                {isDeveloper(u) && !meDev ? (
                  <span className="text-[12.5px] text-stone" title="Seul un développeur peut modifier ce compte.">
                    Géré par le développeur
                  </span>
                ) : (
                <button
                  type="button"
                  onClick={() => setEditing(editing === u.id ? null : u.id)}
                  aria-expanded={editing === u.id}
                  className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-umber hover:text-ink"
                >
                  <Icon name="edit" size={14} />
                  Modifier
                </button>
                )}
              </div>
              {editing === u.id && (
                <UserEditor
                  key={u.id + u.email + u.name + u.role}
                  user={u}
                  isMe={u.id === me.id}
                  canGrantDev={meDev}
                  mailEnabled={mailEnabled}
                  onSaved={saved}
                  onClose={() => setEditing(null)}
                  onRemove={() => remove(u)}
                />
              )}
            </div>
          ))}
        </AdminCard>
        <p className="mt-3 text-[13px] leading-relaxed text-stone">
          <strong>Administrateur</strong> : accès complet, y compris la gestion des comptes et des modèles d'e-mails. <strong>Éditeur</strong> : textes, photos,
          événements, tarifs, calendrier et demandes. <strong>Développeur</strong> : tout ce que fait un administrateur, plus l'espace technique (sauvegardes,
          connexions, maintenance) ; ses actions apparaissent dans l'activité du tableau de bord. Chacun peut modifier son nom, son e-mail et son mot de passe dans{" "}
          <Link to="/admin/compte" className="font-semibold text-clay">
            Mon compte
          </Link>
          .
        </p>
      </div>

      <AdminCard className="p-6">
        <AdminH2 className="mb-4">Ajouter une personne</AdminH2>
        <form onSubmit={create} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <AdminLabel htmlFor="u-name">Prénom et nom</AdminLabel>
            <input id="u-name" required value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className={adminInputClass} />
          </div>
          <div className="flex flex-col gap-1.5">
            <AdminLabel htmlFor="u-email">E-mail</AdminLabel>
            <input id="u-email" type="email" required value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} className={adminInputClass} />
          </div>
          <div className="flex flex-col gap-1.5">
            <AdminLabel htmlFor="u-role">Rôle</AdminLabel>
            <select id="u-role" value={draft.role} onChange={(e) => setDraft({ ...draft, role: e.target.value as AdminUser["role"] })} className={adminInputClass}>
              <option value="editor">Éditeur</option>
              <option value="admin">Administrateur</option>
              {meDev && <option value="developer">Développeur</option>}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <AdminLabel htmlFor="u-pass">Mot de passe provisoire {mailEnabled ? "(facultatif)" : ""}</AdminLabel>
            <input
              id="u-pass"
              type="text"
              minLength={10}
              required={!mailEnabled}
              autoComplete="off"
              value={draft.password}
              onChange={(e) => setDraft({ ...draft, password: e.target.value })}
              className={adminInputClass}
            />
            <p className="text-[13px] text-stone">
              {mailEnabled
                ? "Laissé vide, une invitation est envoyée par e-mail pour que la personne choisisse son mot de passe."
                : "L'envoi d'e-mails n'est pas configuré : communiquez ce mot de passe à la personne."}
            </p>
          </div>
          <Button type="submit" variant="clay" size="pillMd" className="self-start" disabled={saving}>
            {draft.password || !mailEnabled ? "Créer le compte" : "Envoyer l'invitation"}
          </Button>
        </form>
      </AdminCard>
    </div>
  );
}
