import { useCallback, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AdminCard, AdminH2, AdminLabel, Icon, StatusBadge, adminInputClass } from "@/components/admin/admin-ui";
import { useAuth } from "@/providers/auth-provider";
import { api } from "@/lib/api";
import { formatRelative, initials } from "@/lib/format";
import type { AdminUser } from "@/lib/types";

const roleLabels = { admin: "Administrateur", editor: "Éditeur" } as const;
const emptyDraft = { name: "", email: "", role: "editor" as AdminUser["role"], password: "" };

export function AdminUsers() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [draft, setDraft] = useState(emptyDraft);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setUsers(await api.get<AdminUser[]>("/api/admin/users"));
    } catch (e) {
      toast.error((e as Error).message);
    }
  }, []);
  useEffect(() => {
    if (me?.role === "admin") load();
  }, [load, me?.role]);

  if (me?.role !== "admin") return <Navigate to="/admin" replace />;

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

  const changeRole = async (u: AdminUser, role: AdminUser["role"]) => {
    try {
      await api.patch(`/api/admin/users/${u.id}`, { role });
      toast.success(`${u.name} est maintenant ${roleLabels[role].toLowerCase()}.`);
      load();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const resetPassword = async (u: AdminUser) => {
    const password = window.prompt(`Nouveau mot de passe pour ${u.name} (10 caractères min.) :`);
    if (!password) return;
    try {
      await api.patch(`/api/admin/users/${u.id}`, { password });
      toast.success("Mot de passe modifié — ses autres sessions sont déconnectées.");
      load();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const remove = async (u: AdminUser) => {
    if (!window.confirm(`Supprimer définitivement le compte de ${u.name} ? Cette personne n'aura plus accès à l'administration.`)) return;
    try {
      await api.delete(`/api/admin/users/${u.id}`);
      toast.success("Compte supprimé.");
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
            <div key={u.id} className={i < users.length - 1 ? "flex flex-wrap items-center gap-3.5 border-b border-line py-4" : "flex flex-wrap items-center gap-3.5 py-4"}>
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-clay text-[13px] font-semibold text-cream">{initials(u.name)}</span>
              <div className="min-w-[180px] flex-1">
                <p className="text-[14px] font-semibold">
                  {u.name} {u.id === me.id && <span className="text-[12px] font-normal text-stone">(vous)</span>}
                </p>
                <p className="text-[12.5px] text-stone">
                  {u.email} · {u.pending ? "invitation en attente" : u.lastLoginAt ? `connecté ${formatRelative(u.lastLoginAt)}` : "jamais connecté"}
                </p>
              </div>
              {u.id === me.id ? (
                <StatusBadge tone="sage">{roleLabels[u.role]}</StatusBadge>
              ) : (
                <select
                  aria-label={`Rôle de ${u.name}`}
                  value={u.role}
                  onChange={(e) => changeRole(u, e.target.value as AdminUser["role"])}
                  className="rounded-full border border-line-strong bg-cream px-3 py-1.5 text-[12.5px] font-semibold text-umber"
                >
                  <option value="admin">Administrateur</option>
                  <option value="editor">Éditeur</option>
                </select>
              )}
              {u.id !== me.id && (
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => resetPassword(u)} className="text-[12.5px] font-semibold text-umber hover:text-ink">
                    Mot de passe
                  </button>
                  <button type="button" onClick={() => remove(u)} className="text-clay hover:text-[#8A3B22]" title="Supprimer" aria-label={`Supprimer le compte de ${u.name}`}>
                    <Icon name="trash" size={16} strokeWidth={2} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </AdminCard>
        <p className="mt-3 text-[12.5px] leading-relaxed text-stone">
          <strong>Administrateur</strong> : accès complet, y compris la gestion des comptes. <strong>Éditeur</strong> : textes, photos, événements, tarifs, calendrier et
          demandes, sans pouvoir gérer les comptes.
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
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <AdminLabel htmlFor="u-pass">Mot de passe provisoire (facultatif)</AdminLabel>
            <input id="u-pass" type="text" minLength={10} autoComplete="off" value={draft.password} onChange={(e) => setDraft({ ...draft, password: e.target.value })} className={adminInputClass} />
            <p className="text-[12px] text-stone">Laissé vide, une invitation est envoyée par e-mail pour que la personne choisisse son mot de passe (nécessite la configuration SMTP).</p>
          </div>
          <Button type="submit" variant="clay" size="pillMd" className="self-start" disabled={saving}>
            {draft.password ? "Créer le compte" : "Envoyer l'invitation"}
          </Button>
        </form>
      </AdminCard>
    </div>
  );
}
