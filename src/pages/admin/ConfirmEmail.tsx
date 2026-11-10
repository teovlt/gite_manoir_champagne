import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Accent, Logo } from "@/components/site/ornaments";
import { ApiError, api } from "@/lib/api";

/** Landing page of the link sent to a new e-mail address. */
export function AdminConfirmEmail() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [state, setState] = useState<{ ok: boolean; message: string } | null>(token ? null : { ok: false, message: "Lien incomplet." });
  const sent = useRef(false);

  useEffect(() => {
    if (!token || sent.current) return;
    sent.current = true; // the token works only once (StrictMode runs effects twice)
    api
      .post<{ email: string }>("/api/auth/confirm-email", { token })
      .then(({ email }) => setState({ ok: true, message: `C'est fait : vous vous connectez désormais avec ${email}.` }))
      .catch((err) => setState({ ok: false, message: err instanceof ApiError ? err.message : "Impossible de confirmer l'adresse." }));
  }, [token]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-parchment px-5 py-10 text-ink">
      <div className="w-full max-w-[420px] rounded-[20px] bg-cream px-[clamp(24px,6vw,38px)] py-11 text-center shadow-[0_20px_50px_rgba(43,42,37,0.12)]">
        <div className="mb-6 flex flex-col items-center gap-3.5">
          <Logo size={56} />
          <span className="font-serif text-[19px] font-semibold">Nouvelle adresse e-mail</span>
        </div>
        <Accent className="mb-7 justify-center" />
        <p role="status" className={state && !state.ok ? "text-sm text-[#8A3B22]" : "text-sm text-umber"}>
          {state?.message ?? "Confirmation en cours…"}
        </p>
        {state && (
          <Link to="/admin" className="mt-6 inline-block text-sm font-semibold text-clay">
            Aller à l'administration
          </Link>
        )}
      </div>
    </div>
  );
}
