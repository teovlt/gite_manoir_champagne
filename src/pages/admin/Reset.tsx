import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Accent, Logo } from "@/components/site/ornaments";
import { AdminLabel } from "@/components/admin/admin-ui";
import { useAuth } from "@/providers/auth-provider";
import { ApiError, api } from "@/lib/api";
import type { AdminUser } from "@/lib/types";

const inputClass =
  "rounded-[14px] border border-line-strong bg-sand px-[15px] py-[13px] text-sm outline-none focus-visible:border-sage-dark focus-visible:ring-[3px] focus-visible:ring-sage/40";

/** Password reset & invitation landing page (link sent by e-mail). */
export function AdminReset() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) return setError("Les deux mots de passe ne correspondent pas.");
    setPending(true);
    setError(null);
    try {
      setUser(await api.post<AdminUser>("/api/auth/reset", { token, password }));
      toast.success("Mot de passe enregistré, vous êtes connecté.");
      navigate("/admin", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Impossible d'enregistrer le mot de passe.");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-parchment px-5 py-10 text-ink">
      <div className="w-full max-w-[420px] rounded-[20px] bg-cream px-[clamp(24px,6vw,38px)] py-11 shadow-[0_20px_50px_rgba(43,42,37,0.12)]">
        <div className="mb-6 flex flex-col items-center gap-3.5 text-center">
          <Logo size={56} />
          <span className="font-serif text-[19px] font-semibold">Choisir un mot de passe</span>
        </div>
        <Accent className="mb-7 justify-center" />
        {!token ? (
          <p className="text-center text-sm text-umber">
            Lien incomplet. <Link to="/admin/connexion" className="font-semibold text-clay">Retour à la connexion</Link>
          </p>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-[18px]">
            <div className="flex flex-col gap-1.5">
              <AdminLabel htmlFor="new-pass">Nouveau mot de passe (10 caractères min.)</AdminLabel>
              <input id="new-pass" type="password" required minLength={10} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} />
            </div>
            <div className="flex flex-col gap-1.5">
              <AdminLabel htmlFor="confirm-pass">Confirmation</AdminLabel>
              <input id="confirm-pass" type="password" required minLength={10} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={inputClass} />
            </div>
            {error && (
              <p role="alert" className="rounded-xl bg-[#F6E1D7] px-3.5 py-2.5 text-[13px] text-[#8A3B22]">
                {error}
              </p>
            )}
            <Button type="submit" variant="clay" disabled={pending} className="h-auto py-3.5 text-[13px]">
              {pending ? "Enregistrement…" : "Enregistrer et me connecter"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
