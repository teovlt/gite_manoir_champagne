import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AdminCard, AdminH2, AdminLabel, InfoNote, LangSwitch, PillTabs, adminInputClass, type AdminLang } from "@/components/admin/admin-ui";
import { contentPages, defaultContent, resolveText, useSiteData } from "@/providers/site-data-provider";
import { api } from "@/lib/api";
import { localize } from "@/lib/locale";
import type { NavLink, PageValues } from "@/lib/types";
import { cn } from "@/lib/utils";

const langName = { fr: "français", en: "anglais", de: "allemand" } as const;

export function AdminContent() {
  const { data, refresh } = useSiteData();
  const [pageId, setPageId] = useState(contentPages[0].id);
  const [lang, setLang] = useState<AdminLang>("fr");
  const [values, setValues] = useState<PageValues>({});
  const [links, setLinks] = useState<NavLink[]>(data.navLinks);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  const page = contentPages.find((p) => p.id === pageId)!;

  // Load the effective texts of this page/language (owner's text, else the default translation).
  useEffect(() => {
    if (dirty) return;
    setValues({
      [pageId]: Object.fromEntries(page.sections.flatMap((s) => s.fields.map((f) => [f.key, resolveText(data.content, lang, pageId, f.key)]))),
    });
    setLinks(data.navLinks);
  }, [data, pageId, lang, dirty, page]);

  const setField = (key: string, value: string) => {
    setValues((v) => ({ ...v, [pageId]: { ...v[pageId], [key]: value } }));
    setDirty(true);
  };
  const setLink = (i: number, patch: Partial<NavLink>) => {
    setLinks((l) => l.map((x, j) => (j === i ? { ...x, ...patch } : x)));
    setDirty(true);
  };

  const guard = () => !dirty || window.confirm("Des modifications ne sont pas enregistrées. Continuer quand même ?");
  const switchPage = (id: string) => guard() && (setDirty(false), setPageId(id));
  const switchLang = (l: AdminLang) => guard() && (setDirty(false), setLang(l));

  const save = async () => {
    setSaving(true);
    try {
      await api.put(`/api/admin/content/${pageId}`, { lang, values: values[pageId] });
      if (pageId === "accueil") await api.put("/api/admin/nav-links", { links });
      setDirty(false);
      await refresh();
      toast.success(`Modifications enregistrées (${langName[lang]}) — elles sont en ligne.`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PillTabs label="Pages du site" items={contentPages.map((p) => ({ id: p.id, label: p.label }))} value={pageId} onChange={switchPage} className="mb-5" />

      <div className="mb-6 flex flex-wrap items-center gap-4">
        <LangSwitch value={lang} onChange={switchLang} />
        <div className="min-w-[260px] flex-1">
          <InfoNote>
            Vous modifiez la page <strong>{page.label}</strong> en <strong>{langName[lang]}</strong>. Les changements sont visibles immédiatement après enregistrement.
          </InfoNote>
        </div>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(460px,100%),1fr))] gap-7">
        {page.sections.map((section) => (
          <AdminCard key={section.title} className="flex flex-col gap-[18px] p-6">
            <AdminH2>{section.title}</AdminH2>
            {section.fields.map((f) => {
              const id = `${pageId}-${f.key}`;
              const value = values[pageId]?.[f.key] ?? "";
              const reference = lang !== "fr" ? resolveText(data.content, "fr", pageId, f.key) : null;
              const isDefault = value === (defaultContent[lang]?.[pageId]?.[f.key] ?? "");
              return (
                <div key={f.key} className="flex flex-col gap-1.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <AdminLabel htmlFor={id}>{f.label}</AdminLabel>
                    {isDefault && <span className="text-[10.5px] text-pebble">texte d'origine</span>}
                  </div>
                  {f.type === "textarea" ? (
                    <textarea
                      id={id}
                      rows={Math.min(14, Math.max(2, Math.ceil(value.length / 70) + value.split("\n").length - 1))}
                      value={value}
                      onChange={(e) => setField(f.key, e.target.value)}
                      className={cn(adminInputClass, "resize-y")}
                    />
                  ) : (
                    <input id={id} type="text" value={value} onChange={(e) => setField(f.key, e.target.value)} className={adminInputClass} />
                  )}
                  {reference && reference !== value && (
                    <details className="text-[12px] text-stone">
                      <summary className="cursor-pointer select-none">Voir le texte français</summary>
                      <p className="mt-1 whitespace-pre-line rounded-lg bg-sand px-3 py-2">{reference}</p>
                    </details>
                  )}
                </div>
              );
            })}
          </AdminCard>
        ))}

        {pageId === "accueil" && (
          <AdminCard className="flex flex-col gap-3.5 p-6">
            <AdminH2>Liens du pied de page (colonne « Explorer »)</AdminH2>
            <div className="grid grid-cols-[1fr_1fr_auto] gap-3 text-[11px] uppercase tracking-[0.5px] text-stone">
              <span>Libellé ({lang.toUpperCase()})</span>
              <span>Lien</span>
              <span className="w-12" />
            </div>
            {links.map((link, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_auto] items-center gap-3">
                <input
                  aria-label={`Libellé du lien ${i + 1}`}
                  value={link.label[lang] ?? ""}
                  placeholder={link.label.fr}
                  onChange={(e) => setLink(i, { label: { ...link.label, [lang]: e.target.value } })}
                  className={cn(adminInputClass, "rounded-xl px-[13px] py-2.5 text-[13.5px]")}
                />
                <input
                  aria-label={`Adresse du lien ${i + 1}`}
                  value={link.href}
                  onChange={(e) => setLink(i, { href: e.target.value })}
                  placeholder="/le-gite"
                  className={cn(adminInputClass, "rounded-xl px-[13px] py-2.5 text-[13.5px] text-stone")}
                />
                <button
                  type="button"
                  onClick={() => {
                    setLinks(links.filter((_, j) => j !== i));
                    setDirty(true);
                  }}
                  className="text-[12.5px] font-semibold text-clay hover:underline"
                >
                  Retirer
                </button>
              </div>
            ))}
            <button
              type="button"
              disabled={links.length >= 12}
              onClick={() => {
                setLinks([...links, { label: { fr: "", en: "", de: "" }, href: "/" }]);
                setDirty(true);
              }}
              className="self-start rounded-full border border-dashed border-khaki px-4 py-2 text-[13px] font-semibold text-umber hover:text-ink"
            >
              + Ajouter un lien
            </button>
            <p className="text-[12px] text-stone">Les liens internes (« /le-gite ») mènent automatiquement à la bonne langue.</p>
          </AdminCard>
        )}
      </div>

      <div className="sticky bottom-0 mt-8 flex flex-wrap items-center gap-3 border-t border-line-strong bg-parchment/95 py-4 backdrop-blur">
        <Button type="button" variant="clay" size="pillMd" className="px-8" disabled={!dirty || saving} onClick={save}>
          {saving ? "Enregistrement…" : "Enregistrer les modifications"}
        </Button>
        <Link to={localize(page.path, lang)} target="_blank" className="px-2.5 py-3.5 text-[13px] font-semibold uppercase tracking-[1px] text-umber hover:text-clay">
          Aperçu du site →
        </Link>
        {dirty && <span className="text-[12.5px] text-stone">Modifications non enregistrées</span>}
      </div>
    </>
  );
}
