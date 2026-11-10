import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Accent, Logo } from "@/components/site/ornaments";
import { AdminLabel } from "@/components/admin/admin-ui";
import { useAuth } from "@/providers/auth-provider";
import { ApiError, api } from "@/lib/api";

const inputClass =
  "rounded-[14px] border border-line-strong bg-sand px-[15px] py-[13px] text-sm outline-none placeholder:text-[#B9B199] focus-visible:border-sage-dark focus-visible:ring-[3px] focus-visible:ring-sage/40";

export function AdminLogin() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const from = (location.state as { from?: string } | null)?.from ?? "/admin";
  if (user) return <Navigate to={from} replace />;

  const forgot = async () => {
    if (!email) {
      setError("Indiquez d'abord votre adresse e-mail ci-dessus.");
      return;
    }
    setError(null);
    try {
      const res = await api.post<{ mailEnabled: boolean }>("/api/auth/forgot", { email });
      if (res.mailEnabled) toast.success("Si un compte existe pour cette adresse, un lien de réinitialisation vient d'être envoyé.");
      else toast.info("L'envoi d'e-mails n'est pas configuré : demandez à un administrateur de changer votre mot de passe.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Demande impossible.");
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      await login(email, password, remember);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Connexion impossible.");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-parchment px-5 py-10 text-ink">
      <div className="absolute -right-[120px] -top-[120px] size-[420px] rounded-full bg-line-strong opacity-60" aria-hidden="true" />
      <div className="absolute -bottom-[140px] -left-[100px] size-[360px] rounded-full bg-[#D7E0CB] opacity-55" aria-hidden="true" />

      <div className="relative z-[1] w-full max-w-[420px] rounded-[20px] bg-cream px-[clamp(24px,6vw,38px)] py-11 shadow-[0_20px_50px_rgba(43,42,37,0.12)]">
        <div className="mb-7 flex flex-col items-center gap-3.5">
          <Logo size={56} />
          <div className="text-center">
            <span className="block font-serif text-[19px] font-semibold">Manoir de la Champagne</span>
            <span className="mt-1 block text-[12px] uppercase tracking-[1.5px] text-stone">Espace propriétaires</span>
          </div>
        </div>

        <Accent className="mb-7 justify-center" />

        <form onSubmit={submit} className="flex flex-col gap-[18px]">
          <div className="flex flex-col gap-1.5">
            <AdminLabel htmlFor="admin-email">Adresse e-mail</AdminLabel>
            <input
              id="admin-email"
              type="email"
              required
              autoComplete="username"
              placeholder="maryline@manoirdelachampagne.fr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <AdminLabel htmlFor="admin-pass">Mot de passe</AdminLabel>
            <input
              id="admin-pass"
              type="password"
              required
              autoComplete="current-password"
              placeholder="••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 text-[13px]">
            <label className="flex items-center gap-[7px] text-umber">
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="accent-sage-dark" /> Se souvenir de moi
            </label>
            <button type="button" className="font-semibold text-clay hover:underline" onClick={forgot}>
              Mot de passe oublié ?
            </button>
          </div>
          {error && (
            <p role="alert" className="rounded-xl bg-[#F6E1D7] px-3.5 py-2.5 text-[13px] text-[#8A3B22]">
              {error}
            </p>
          )}
          <Button type="submit" variant="clay" disabled={pending} className="mt-1.5 h-auto py-3.5 text-[13px]">
            {pending ? "Connexion…" : "Se connecter"}
          </Button>
        </form>

        <p className="mt-[26px] text-center text-xs text-stone">Accès réservé à Loïc &amp; Maryline Courteille.</p>
      </div>
    </div>
  );
}
