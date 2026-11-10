import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AdminCard, AdminH2, AdminLabel, InfoNote, adminInputClass, adminSecondaryButtonClass } from "@/components/admin/admin-ui";
import { useAuth } from "@/providers/auth-provider";
import { api } from "@/lib/api";
import type { AdminUser } from "@/lib/types";

export function AdminAccount() {
  const { user, setUser } = useAuth();
  const [profile, setProfile] = useState({ name: user?.name ?? "", email: user?.email ?? "", password: "" });
  const [pwd, setPwd] = useState({ current: "", next: "", confirm: "" });
  const [saving, setSaving] = useState<"profile" | "password" | "link" | null>(null);
  const [mailEnabled, setMailEnabled] = useState(false);

  useEffect(() => {
    api
      .get<{ enabled: boolean }>("/api/admin/mail-status")
      .then((r) => setMailEnabled(r.enabled))
      .catch(() => {});
  }, []);

  if (!user) return null;
  const emailChanged = profile.email.trim().toLowerCase() !== user.email;

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving("profile");
    try {
      const res = await api.put<AdminUser & { emailPending: boolean }>("/api/admin/me", {
        name: profile.name,
        email: profile.email,
        ...(emailChanged && { currentPassword: profile.password }),
      });
      setUser(res);
      setProfile({ name: res.name, email: res.email, password: "" });
      toast.success(
        res.emailPending
          ? `Un lien de confirmation a été envoyé à ${res.pendingEmail}. L'adresse changera quand vous l'aurez ouvert.`
          : "Profil mis à jour.",
      );
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(null);
    }
  };

  const cancelPendingEmail = async () => {
    try {
      setUser(await api.delete<AdminUser>("/api/admin/me/pending-email"));
      toast.success("Changement d'adresse annulé.");
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwd.next !== pwd.confirm) return toast.error("Les deux nouveaux mots de passe ne correspondent pas.");
    setSaving("password");
    try {
      setUser(await api.put<AdminUser>("/api/admin/me", { currentPassword: pwd.current, newPassword: pwd.next }));
      setPwd({ current: "", next: "", confirm: "" });
      toast.success("Mot de passe changé. Vos autres appareils sont déconnectés.");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(null);
    }
  };

  const sendLink = async () => {
    setSaving("link");
    try {
      const { email } = await api.post<{ email: string }>("/api/admin/me/password-link");
      toast.success(`Lien envoyé à ${email} (valable 1 heure).`);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(min(400px,100%),1fr))] items-start gap-7">
      <AdminCard className="p-6">
        <AdminH2 className="mb-4">Mon profil</AdminH2>
        <form onSubmit={saveProfile} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <AdminLabel htmlFor="me-name">Prénom et nom</AdminLabel>
            <input id="me-name" required value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} className={adminInputClass} />
          </div>
          <div className="flex flex-col gap-1.5">
            <AdminLabel htmlFor="me-email">E-mail de connexion</AdminLabel>
            <input
              id="me-email"
              type="email"
              required
              autoComplete="email"
              value={profile.email}
              onChange={(e) => setProfile({ ...profile, email: e.target.value })}
              className={adminInputClass}
            />
            {emailChanged && mailEnabled && (
              <p className="text-[12px] text-stone">Un lien de confirmation sera envoyé à la nouvelle adresse : elle ne remplacera l'actuelle qu'une fois ouverte.</p>
            )}
          </div>
          {emailChanged && (
            <div className="flex flex-col gap-1.5">
              <AdminLabel htmlFor="me-email-pass">Mot de passe actuel (pour changer d'e-mail)</AdminLabel>
              <input
                id="me-email-pass"
                type="password"
                required
                autoComplete="current-password"
                value={profile.password}
                onChange={(e) => setProfile({ ...profile, password: e.target.value })}
                className={adminInputClass}
              />
            </div>
          )}
          {user.pendingEmail && (
            <InfoNote>
              En attente de confirmation : <strong>{user.pendingEmail}</strong>.{" "}
              <button type="button" onClick={cancelPendingEmail} className="font-semibold text-clay underline-offset-2 hover:underline">
                Annuler
              </button>
            </InfoNote>
          )}
          <Button type="submit" variant="clay" size="pill" className="self-start" disabled={saving === "profile"}>
            {saving === "profile" ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </form>
      </AdminCard>

      <AdminCard className="p-6">
        <AdminH2 className="mb-2">Changer de mot de passe</AdminH2>
        {mailEnabled && (
          <div className="mb-5 border-b border-line pb-5">
            <p className="mb-3 text-[13px] leading-relaxed text-ink-soft">
              Mot de passe oublié ? Recevez un lien à <strong>{user.email}</strong> pour en choisir un nouveau.
            </p>
            <button type="button" onClick={sendLink} disabled={saving === "link"} className={adminSecondaryButtonClass}>
              {saving === "link" ? "Envoi…" : "M'envoyer un lien par e-mail"}
            </button>
          </div>
        )}
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
          <Button type="submit" variant="clay" size="pill" className="self-start" disabled={saving === "password"}>
            {saving === "password" ? "Enregistrement…" : "Changer le mot de passe"}
          </Button>
        </form>
      </AdminCard>
    </div>
  );
}
