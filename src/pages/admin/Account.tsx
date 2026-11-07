import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AdminCard, AdminH2, AdminLabel, adminInputClass } from "@/components/admin/admin-ui";
import { useAuth } from "@/providers/auth-provider";
import { api } from "@/lib/api";
import type { AdminUser } from "@/lib/types";

export function AdminAccount() {
  const { user, setUser } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [pwd, setPwd] = useState({ current: "", next: "", confirm: "" });
  const [saving, setSaving] = useState(false);

  const saveName = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setUser(await api.put<AdminUser>("/api/admin/me", { name }));
      toast.success("Nom mis à jour.");
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwd.next !== pwd.confirm) return toast.error("Les deux nouveaux mots de passe ne correspondent pas.");
    setSaving(true);
    try {
      setUser(await api.put<AdminUser>("/api/admin/me", { currentPassword: pwd.current, newPassword: pwd.next }));
      setPwd({ current: "", next: "", confirm: "" });
      toast.success("Mot de passe changé. Vos autres appareils sont déconnectés.");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(min(400px,100%),1fr))] items-start gap-7">
      <AdminCard className="p-6">
        <AdminH2 className="mb-4">Mon profil</AdminH2>
        <form onSubmit={saveName} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <AdminLabel htmlFor="me-name">Prénom et nom</AdminLabel>
            <input id="me-name" required value={name} onChange={(e) => setName(e.target.value)} className={adminInputClass} />
          </div>
          <div className="flex flex-col gap-1.5">
            <AdminLabel>E-mail de connexion</AdminLabel>
            <p className="text-sm text-ink-soft">{user?.email}</p>
          </div>
          <Button type="submit" variant="clay" size="pill" className="self-start">
            Enregistrer
          </Button>
        </form>
      </AdminCard>

      <AdminCard className="p-6">
        <AdminH2 className="mb-4">Changer de mot de passe</AdminH2>
        <form onSubmit={savePassword} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <AdminLabel htmlFor="me-cur">Mot de passe actuel</AdminLabel>
            <input id="me-cur" type="password" required autoComplete="current-password" value={pwd.current} onChange={(e) => setPwd({ ...pwd, current: e.target.value })} className={adminInputClass} />
          </div>
          <div className="flex flex-col gap-1.5">
            <AdminLabel htmlFor="me-new">Nouveau mot de passe (10 caractères min.)</AdminLabel>
            <input id="me-new" type="password" required minLength={10} autoComplete="new-password" value={pwd.next} onChange={(e) => setPwd({ ...pwd, next: e.target.value })} className={adminInputClass} />
          </div>
          <div className="flex flex-col gap-1.5">
            <AdminLabel htmlFor="me-conf">Confirmation</AdminLabel>
            <input id="me-conf" type="password" required minLength={10} autoComplete="new-password" value={pwd.confirm} onChange={(e) => setPwd({ ...pwd, confirm: e.target.value })} className={adminInputClass} />
          </div>
          <Button type="submit" variant="clay" size="pill" className="self-start" disabled={saving}>
            {saving ? "Enregistrement…" : "Changer le mot de passe"}
          </Button>
        </form>
      </AdminCard>
    </div>
  );
}
