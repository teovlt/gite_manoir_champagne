import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AdminCard,
  AdminH2,
  AdminLabel,
  InfoNote,
  LangSwitch,
  StatusBadge,
  adminInputClass,
  adminSecondaryButtonClass,
  type AdminLang,
} from "@/components/admin/admin-ui";
import { useAuth } from "@/providers/auth-provider";
import { api } from "@/lib/api";
import type { MailTemplate } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Listing {
  mailEnabled: boolean;
  notifyEmail: boolean;
  templates: MailTemplate[];
}

const fill = (text: string, vars: Record<string, string>) => text.replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (all, key: string) => vars[key] ?? all);
const current = (t: MailTemplate, lang: AdminLang) => t.custom[lang] ?? t.defaults[lang] ?? { subject: "", body: "" };

export function AdminMailTemplates() {
  const { user } = useAuth();
  const [data, setData] = useState<Listing | null>(null);
  const [selected, setSelected] = useState<string>("");
  const [lang, setLang] = useState<AdminLang>("fr");
  const [draft, setDraft] = useState({ subject: "", body: "" });
  const [busy, setBusy] = useState<"save" | "test" | null>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const subjectRef = useRef<HTMLInputElement>(null);
  const lastField = useRef<"subject" | "body">("body");

  useEffect(() => {
    if (user?.role !== "admin") return;
    api
      .get<Listing>("/api/admin/mail-templates")
      .then((d) => {
        setData(d);
        setSelected((s) => s || d.templates[0]?.id || "");
      })
      .catch((e) => toast.error(e.message));
  }, [user?.role]);

  const tpl = data?.templates.find((t) => t.id === selected);
  const saved = tpl ? current(tpl, lang) : null;

  // Load the selected template/language into the editor.
  useEffect(() => {
    if (tpl) setDraft(current(tpl, tpl.langs.includes(lang) ? lang : "fr"));
  }, [tpl, lang]);

  const dirty = Boolean(saved && (draft.subject !== saved.subject || draft.body !== saved.body));
  const def = tpl?.defaults[lang];
  const isDefault = Boolean(def && draft.subject.trim() === def.subject && draft.body.trim() === def.body.trim());

  const preview = useMemo(
    () => (tpl ? { subject: fill(draft.subject, tpl.sample).replace(/\s*\n\s*/g, " "), body: fill(draft.body, tpl.sample) } : null),
    [tpl, draft],
  );
  const unknownVars = useMemo(() => {
    if (!tpl) return [];
    const known = new Set(tpl.variables.map((v) => v.key));
    const used = [...`${draft.subject}\n${draft.body}`.matchAll(/\{\{\s*([a-z_]+)\s*\}\}/g)].map((m) => m[1]);
    return [...new Set(used.filter((k) => !known.has(k)))];
  }, [tpl, draft]);

  if (user?.role !== "admin") return <Navigate to="/admin" replace />;
  if (!data || !tpl || !preview) return <div className="text-sm text-stone">Chargement…</div>;

  const choose = (id: string) => {
    if (dirty && !window.confirm("Abandonner les modifications non enregistrées de ce modèle ?")) return;
    setSelected(id);
    const next = data.templates.find((t) => t.id === id);
    if (next && !next.langs.includes(lang)) setLang("fr");
  };
  const chooseLang = (l: AdminLang) => {
    if (dirty && !window.confirm("Abandonner les modifications non enregistrées de cette langue ?")) return;
    setLang(l);
  };

  /** Inserts {{variable}} where the cursor was, in the subject or the body. */
  const insertVar = (key: string) => {
    const field = lastField.current;
    const el = field === "subject" ? subjectRef.current : bodyRef.current;
    const token = `{{${key}}}`;
    const value = draft[field];
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    setDraft({ ...draft, [field]: value.slice(0, start) + token + value.slice(end) });
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + token.length, start + token.length);
    });
  };

  const save = async (values = draft) => {
    setBusy("save");
    try {
      const updated = await api.put<MailTemplate>(`/api/admin/mail-templates/${tpl.id}`, { lang, ...values });
      setData({ ...data, templates: data.templates.map((t) => (t.id === updated.id ? updated : t)) });
      toast.success("Modèle enregistré.");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const restoreDefault = () => {
    if (!def || !window.confirm("Remettre le texte d'origine de ce modèle ? Votre version sera perdue.")) return;
    setDraft(def);
    save(def);
  };

  const sendTest = async () => {
    setBusy("test");
    try {
      const { email } = await api.post<{ email: string }>(`/api/admin/mail-templates/${tpl.id}/test`, { lang, ...draft });
      toast.success(`E-mail de test envoyé à ${email}.`);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const audiences = [...new Set(data.templates.map((t) => t.audience))];

  return (
    <div className="flex flex-col gap-6">
      {!data.mailEnabled && (
        <InfoNote>L'envoi d'e-mails n'est pas configuré (RESEND_API_KEY) : vous pouvez préparer les modèles, ils serviront dès qu'il le sera.</InfoNote>
      )}
      {data.mailEnabled && !data.notifyEmail && (
        <InfoNote>NOTIFY_EMAIL n'est pas défini : les e-mails destinés aux propriétaires ne sont pas envoyés.</InfoNote>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <nav aria-label="Modèles d'e-mails" className="flex flex-col gap-5">
          {audiences.map((a) => (
            <div key={a}>
              <p className="mb-2 text-[11px] uppercase tracking-[1px] text-stone">{a}</p>
              <div className="flex flex-col gap-1.5">
                {data.templates
                  .filter((t) => t.audience === a)
                  .map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => choose(t.id)}
                      aria-current={t.id === selected}
                      className={cn(
                        "flex items-center justify-between gap-2 rounded-xl border px-3.5 py-3 text-left text-[13.5px] font-medium transition-colors",
                        t.id === selected ? "border-ink bg-ink text-cream" : "border-line-strong bg-cream text-ink hover:border-khaki",
                      )}
                    >
                      <span>{t.label}</span>
                      {Object.keys(t.custom).length > 0 && (
                        <StatusBadge tone="wheat" className="shrink-0">
                          Modifié
                        </StatusBadge>
                      )}
                    </button>
                  ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="grid min-w-0 items-start gap-6 xl:grid-cols-2">
          <AdminCard className="min-w-0 p-6">
            <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
              <AdminH2>{tpl.label}</AdminH2>
              {tpl.langs.length > 1 && <LangSwitch value={lang} onChange={chooseLang} />}
            </div>
            <p className="mb-5 text-[13px] leading-relaxed text-stone">{tpl.description}</p>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <AdminLabel htmlFor="mail-subject">Objet</AdminLabel>
                <input
                  id="mail-subject"
                  ref={subjectRef}
                  value={draft.subject}
                  maxLength={300}
                  onFocus={() => (lastField.current = "subject")}
                  onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
                  className={adminInputClass}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <AdminLabel htmlFor="mail-body">Message</AdminLabel>
                <textarea
                  id="mail-body"
                  ref={bodyRef}
                  rows={14}
                  value={draft.body}
                  maxLength={10000}
                  onFocus={() => (lastField.current = "body")}
                  onChange={(e) => setDraft({ ...draft, body: e.target.value })}
                  className={cn(adminInputClass, "resize-y font-mono text-[13px] leading-relaxed")}
                />
              </div>

              <div>
                <p className="mb-2 text-xs uppercase tracking-[0.5px] text-umber">Variables — cliquez pour insérer</p>
                <div className="flex flex-wrap gap-2">
                  {tpl.variables.map((v) => (
                    <button
                      key={v.key}
                      type="button"
                      title={v.label}
                      onClick={() => insertVar(v.key)}
                      className="rounded-full border border-line-strong bg-parchment px-3 py-1.5 font-mono text-[12px] text-umber hover:border-khaki hover:text-ink"
                    >
                      {`{{${v.key}}}`}
                    </button>
                  ))}
                </div>
                <ul className="mt-3 grid gap-1 text-[12px] text-stone">
                  {tpl.variables.map((v) => (
                    <li key={v.key}>
                      <code className="text-umber">{v.key}</code> — {v.label}
                    </li>
                  ))}
                </ul>
                {unknownVars.length > 0 && (
                  <p className="mt-3 text-[12.5px] text-[#8A3B22]">
                    Variable inconnue : {unknownVars.map((k) => `{{${k}}}`).join(", ")} — elle apparaîtra telle quelle dans l'e-mail.
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4">
                <Button type="button" variant="clay" size="pill" onClick={() => save()} disabled={!dirty || busy !== null}>
                  {busy === "save" ? "Enregistrement…" : "Enregistrer"}
                </Button>
                {data.mailEnabled && (
                  <button type="button" onClick={sendTest} disabled={busy !== null} className={adminSecondaryButtonClass}>
                    {busy === "test" ? "Envoi…" : "M'envoyer un test"}
                  </button>
                )}
                {dirty && (
                  <button type="button" onClick={() => setDraft(saved!)} className="text-[13px] font-semibold text-umber hover:text-ink">
                    Annuler les modifications
                  </button>
                )}
                {!isDefault && tpl.custom[lang] && (
                  <button type="button" onClick={restoreDefault} disabled={busy !== null} className="ml-auto text-[13px] font-semibold text-clay hover:text-[#8A3B22]">
                    Rétablir le texte d'origine
                  </button>
                )}
              </div>
            </div>
          </AdminCard>

          <AdminCard className="min-w-0 p-6">
            <AdminH2 className="mb-1">Aperçu</AdminH2>
            <p className="mb-5 text-[12.5px] text-stone">Avec des valeurs d'exemple.</p>
            <div className="rounded-xl border border-line bg-parchment p-4">
              <p className="text-[11px] uppercase tracking-[0.5px] text-stone">Objet</p>
              <p className="mb-4 mt-1 break-words text-[14px] font-semibold">{preview.subject || "—"}</p>
              <div className="whitespace-pre-wrap break-words border-t border-line pt-4 text-[13.5px] leading-relaxed text-ink-soft">{preview.body}</div>
            </div>
          </AdminCard>
        </div>
      </div>
    </div>
  );
}
