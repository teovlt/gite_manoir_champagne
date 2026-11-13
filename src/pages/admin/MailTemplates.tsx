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
import { useConfirm } from "@/components/admin/confirm-dialog";
import { useAuth } from "@/providers/auth-provider";
import { api } from "@/lib/api";
import { isAdmin } from "@/lib/roles";
import type { MailTemplate } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Listing {
  mailEnabled: boolean;
  notifyEmail: boolean;
  templates: MailTemplate[];
}
interface RenderedMail {
  subject: string;
  text: string;
  html: string;
}

const current = (t: MailTemplate, lang: AdminLang) => t.custom[lang] ?? t.defaults[lang] ?? { subject: "", body: "" };

/** Renders the HTML e-mail in an isolated frame that grows with its content. */
function MailFrame({ html }: { html: string }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(520);
  // Layout inside the (script-less) frame settles shortly after "load": measure a few times.
  const fit = () => {
    const measure = () => {
      const doc = ref.current?.contentDocument;
      if (!doc?.body) return;
      doc.documentElement.style.overflow = "hidden"; // the frame grows with the e-mail instead of scrolling
      setHeight(Math.max(320, doc.body.scrollHeight));
    };
    measure();
    for (const ms of [60, 250, 800]) setTimeout(measure, ms);
  };
  return (
    <iframe
      ref={ref}
      title="Aperçu de l'e-mail"
      srcDoc={html}
      sandbox="allow-same-origin"
      onLoad={fit}
      style={{ height }}
      className="w-full rounded-xl border border-line bg-parchment"
    />
  );
}

export function AdminMailTemplates() {
  const { user } = useAuth();
  const confirm = useConfirm();
  const [data, setData] = useState<Listing | null>(null);
  const [selected, setSelected] = useState("");
  const [lang, setLang] = useState<AdminLang>("fr");
  const [draft, setDraft] = useState({ subject: "", body: "" });
  const [busy, setBusy] = useState<"save" | "test" | null>(null);
  const [view, setView] = useState<"edit" | "preview">("edit");
  const [rendered, setRendered] = useState<RenderedMail | null>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const subjectRef = useRef<HTMLInputElement>(null);
  const lastField = useRef<"subject" | "body">("body");

  const allowed = isAdmin(user);
  useEffect(() => {
    if (!allowed) return;
    api
      .get<Listing>("/api/admin/mail-templates")
      .then((d) => {
        setData(d);
        setSelected((s) => s || d.templates[0]?.id || "");
      })
      .catch((e) => toast.error(e.message));
  }, [allowed]);

  const tpl = data?.templates.find((t) => t.id === selected);
  const saved = tpl ? current(tpl, lang) : null;

  // Load the selected template/language into the editor.
  useEffect(() => {
    if (tpl) setDraft(current(tpl, tpl.langs.includes(lang) ? lang : "fr"));
  }, [tpl, lang]);

  // The preview is rendered by the server, exactly as it will be sent (debounced while typing).
  useEffect(() => {
    if (!tpl) return;
    const id = setTimeout(() => {
      api
        .post<RenderedMail>(`/api/admin/mail-templates/${tpl.id}/preview`, { lang, ...draft })
        .then(setRendered)
        .catch(() => {});
    }, 350);
    return () => clearTimeout(id);
  }, [tpl, lang, draft]);

  const dirty = Boolean(saved && (draft.subject !== saved.subject || draft.body !== saved.body));
  const def = tpl?.defaults[lang];

  const unknownVars = useMemo(() => {
    if (!tpl) return [];
    const known = new Set(tpl.variables.map((v) => v.key));
    const used = [...`${draft.subject}\n${draft.body}`.matchAll(/\{\{\s*([a-z_]+)\s*\}\}/g)].map((m) => m[1]);
    return [...new Set(used.filter((k) => !known.has(k)))];
  }, [tpl, draft]);

  if (!allowed) return <Navigate to="/admin" replace />;
  if (!data || !tpl) return <div className="text-sm text-stone">Chargement…</div>;

  const discardOk = async () =>
    !dirty ||
    confirm({
      title: "Modifications non enregistrées",
      message: "Si vous continuez, les changements apportés à ce modèle seront perdus.",
      confirmLabel: "Continuer sans enregistrer",
      danger: true,
    });

  const choose = async (id: string) => {
    if (id === selected || !(await discardOk())) return;
    setSelected(id);
    const next = data.templates.find((t) => t.id === id);
    if (next && !next.langs.includes(lang)) setLang("fr");
  };
  const chooseLang = async (l: AdminLang) => {
    if (l !== lang && (await discardOk())) setLang(l);
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
    setView("edit");
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

  const restoreDefault = async () => {
    if (!def) return;
    const ok = await confirm({
      title: "Rétablir le texte d'origine ?",
      message: "Votre version de ce modèle sera remplacée par le texte fourni avec le site.",
      confirmLabel: "Rétablir",
      danger: true,
    });
    if (!ok) return;
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
        <InfoNote>
          L'envoi d'e-mails n'est pas configuré (RESEND_API_KEY) : vous pouvez préparer les modèles, ils serviront dès qu'il le sera.
        </InfoNote>
      )}
      {data.mailEnabled && !data.notifyEmail && (
        <InfoNote>NOTIFY_EMAIL n'est pas défini : les e-mails destinés aux propriétaires ne sont pas envoyés.</InfoNote>
      )}

      {/* Template picker: one row per audience */}
      <nav aria-label="Modèles d'e-mails" className="flex flex-col gap-3.5">
        {audiences.map((a) => (
          <div key={a} className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-4">
            <span className="text-[12px] font-medium uppercase tracking-[1px] text-stone sm:w-[130px] sm:shrink-0 sm:pt-[11px]">{a}</span>
            <div className="flex flex-wrap gap-2.5">
              {data.templates
                .filter((t) => t.audience === a)
                .map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => choose(t.id)}
                    aria-current={t.id === selected}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-full px-4 py-[9px] text-[13.5px] font-semibold transition-colors",
                      t.id === selected
                        ? "bg-ink text-cream"
                        : "border border-line-strong bg-cream text-umber hover:border-khaki hover:text-ink",
                    )}
                  >
                    {t.label}
                    {Object.keys(t.custom).length > 0 && (
                      <span
                        className={cn("size-2 rounded-full", t.id === selected ? "bg-wheat-light" : "bg-clay")}
                        title="Texte modifié"
                        aria-label="modifié"
                      />
                    )}
                  </button>
                ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Below xl the editor and the preview share the space through tabs */}
      <div
        role="tablist"
        aria-label="Affichage"
        className="inline-flex self-start rounded-full border border-line-strong bg-cream p-1 xl:hidden"
      >
        {(["edit", "preview"] as const).map((v) => (
          <button
            key={v}
            type="button"
            role="tab"
            aria-selected={view === v}
            onClick={() => setView(v)}
            className={cn(
              "rounded-full px-4 py-1.5 text-[13px] font-semibold",
              view === v ? "bg-sage-dark text-cream" : "text-umber hover:text-ink",
            )}
          >
            {v === "edit" ? "Modifier" : "Aperçu"}
          </button>
        ))}
      </div>

      <div className="grid min-w-0 items-start gap-6 xl:grid-cols-2">
        <AdminCard className={cn("min-w-0 p-6", view !== "edit" && "hidden xl:block")}>
          <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <AdminH2>{tpl.label}</AdminH2>
              {tpl.custom[lang] && <StatusBadge tone="wheat">Modifié</StatusBadge>}
            </div>
            {tpl.langs.length > 1 && <LangSwitch value={lang} onChange={chooseLang} />}
          </div>
          <p className="mb-5 text-[13.5px] leading-relaxed text-stone">{tpl.description}</p>

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
                className={cn(adminInputClass, "resize-y leading-relaxed")}
              />
              <p className="text-[13px] leading-relaxed text-stone">
                Une ligne vide sépare deux paragraphes. Un lien seul sur sa ligne devient un bouton dans l'e-mail.
              </p>
            </div>

            <div>
              <p className="mb-2 text-[12.5px] font-medium uppercase tracking-[0.5px] text-umber">Variables — cliquez pour insérer</p>
              <div className="flex flex-col gap-1.5">
                {tpl.variables.map((v) => (
                  <button
                    key={v.key}
                    type="button"
                    onClick={() => insertVar(v.key)}
                    className="group flex items-center gap-3 rounded-xl px-2 py-1.5 text-left hover:bg-parchment"
                  >
                    <code className="shrink-0 rounded-full border border-line-strong bg-parchment px-2.5 py-1 font-mono text-[12.5px] text-umber group-hover:border-khaki group-hover:text-ink">
                      {`{{${v.key}}}`}
                    </code>
                    <span className="text-[13px] text-stone">{v.label}</span>
                  </button>
                ))}
              </div>
              {unknownVars.length > 0 && (
                <p className="mt-3 text-[13px] text-[#8A3B22]">
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
              {tpl.custom[lang] && (
                <button
                  type="button"
                  onClick={restoreDefault}
                  disabled={busy !== null}
                  className="ml-auto text-[13px] font-semibold text-clay hover:text-[#8A3B22]"
                >
                  Rétablir le texte d'origine
                </button>
              )}
            </div>
          </div>
        </AdminCard>

        <AdminCard className={cn("min-w-0 p-6 xl:sticky xl:top-6", view !== "preview" && "hidden xl:block")}>
          <AdminH2 className="mb-1">Aperçu</AdminH2>
          <p className="mb-4 text-[13px] text-stone">Tel que reçu, avec des valeurs d'exemple. Une version texte est aussi envoyée.</p>
          <div className="mb-3 rounded-xl border border-line bg-parchment px-4 py-3">
            <p className="text-[12px] uppercase tracking-[0.5px] text-stone">Objet</p>
            <p className="mt-1 break-words text-[14px] font-semibold">{rendered?.subject || "—"}</p>
          </div>
          {rendered ? <MailFrame html={rendered.html} /> : <div className="h-[320px] rounded-xl border border-line bg-parchment" />}
        </AdminCard>
      </div>
    </div>
  );
}
