import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { AdminCard, Icon, LangSwitch, PillTabs, type AdminLang } from "@/components/admin/admin-ui";
import { useSiteData } from "@/providers/site-data-provider";
import { api } from "@/lib/api";
import type { Photo, PhotoSection } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useConfirm } from "@/components/admin/confirm-dialog";

type Filter = "all" | PhotoSection;

const sectionLabels: Record<PhotoSection, string> = {
  accueil: "Accueil",
  gite: "Le Gîte",
  jardins: "Jardins & Spa",
  region: "La Région",
};

const filters: { id: Filter; label: string }[] = [
  { id: "all", label: "Toutes" },
  ...(Object.entries(sectionLabels) as [PhotoSection, string][]).map(([id, label]) => ({ id, label })),
];

const ACCEPT = "image/jpeg,image/png,image/webp";

function pickFile(onPick: (file: File) => void) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ACCEPT;
  input.onchange = () => input.files?.[0] && onPick(input.files[0]);
  input.click();
}

function PhotoCard({ photo, lang, onChanged }: { photo: Photo; lang: AdminLang; onChanged: () => void }) {
  const confirm = useConfirm();
  const current = photo.alt[lang] ?? "";
  const [alt, setAlt] = useState(current);
  const [busy, setBusy] = useState(false);
  useEffect(() => setAlt(current), [current]);

  const run = async (fn: () => Promise<unknown>, success: string) => {
    setBusy(true);
    try {
      await fn();
      toast.success(success);
      onChanged();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const replace = () =>
    pickFile((file) => {
      const form = new FormData();
      form.append("file", file);
      run(() => api.put(`/api/admin/photos/${photo.id}/file`, form), photo.url ? "Photo remplacée." : "Photo ajoutée.");
    });

  const remove = async () => {
    const ok = await confirm(
      photo.key
        ? { title: "Retirer cette photo ?", message: `« ${photo.alt.fr} » : l'emplacement restera sur la page avec une image d'attente.`, confirmLabel: "Retirer" }
        : { title: "Supprimer cette photo ?", message: `« ${photo.alt.fr} » sera supprimée définitivement.`, confirmLabel: "Supprimer", danger: true },
    );
    if (ok) run(() => api.delete(`/api/admin/photos/${photo.id}`), "Photo retirée.");
  };

  const saveAlt = () => {
    if (alt.trim() !== current) run(() => api.patch(`/api/admin/photos/${photo.id}`, { alt: { [lang]: alt } }), "Légende enregistrée.");
  };

  const actionClass = "flex size-7 items-center justify-center rounded-lg bg-ink/60 text-cream hover:bg-ink/80";

  return (
    <AdminCard className={cn("overflow-hidden rounded-[14px]", busy && "opacity-60")}>
      <div className="relative aspect-[4/3]">
        {photo.url ? (
          <img src={photo.url} alt={photo.alt.fr} loading="lazy" className="block h-full w-full object-cover [filter:saturate(1.1)_sepia(0.04)]" />
        ) : (
          <button
            type="button"
            onClick={replace}
            className="flex h-full w-full flex-col items-center justify-center gap-2 border-b border-dashed border-khaki bg-wheat text-[13px] text-taupe hover:text-ink"
          >
            <Icon name="upload" size={22} />
            Ajouter une photo
          </button>
        )}
        <div className="absolute right-2 top-2 flex gap-1.5">
          {photo.url && (
            <button type="button" onClick={replace} className={actionClass} title="Remplacer la photo" aria-label={`Remplacer ${photo.alt.fr}`}>
              <Icon name="edit" size={14} strokeWidth={2} />
            </button>
          )}
          {(photo.url || !photo.key) && (
            <button type="button" onClick={remove} className={actionClass} title="Supprimer" aria-label={`Supprimer ${photo.alt.fr}`}>
              <Icon name="trash" size={14} strokeWidth={2} />
            </button>
          )}
        </div>
        <span className="absolute bottom-2 left-2 rounded-lg bg-ink/55 px-2 py-[3px] text-[11px] tracking-[0.3px] text-cream">
          {sectionLabels[photo.section]}
          {!photo.key && " · galerie"}
        </span>
      </div>
      <div className="px-3 py-2.5">
        <input
          aria-label={`Légende / texte alternatif (${lang.toUpperCase()})`}
          value={alt}
          placeholder={photo.alt.fr}
          onChange={(e) => setAlt(e.target.value)}
          onBlur={saveAlt}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          className="w-full rounded-[9px] border border-line-strong bg-sand px-[9px] py-[7px] text-[13px] outline-none focus-visible:border-sage-dark"
        />
      </div>
    </AdminCard>
  );
}

export function AdminPhotos() {
  const { refresh } = useSiteData();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [lang, setLang] = useState<AdminLang>("fr");
  const [uploadSection, setUploadSection] = useState<PhotoSection>("accueil");
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      setPhotos(await api.get<Photo[]>("/api/admin/photos"));
    } catch (e) {
      toast.error((e as Error).message);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const changed = () => {
    load();
    refresh();
  };

  const section = filter === "all" ? uploadSection : filter;

  const upload = async (files: FileList | File[]) => {
    const list = Array.from(files).filter((f) => f.type && ACCEPT.includes(f.type));
    if (!list.length) return toast.error("Formats acceptés : JPG, PNG ou WebP.");
    const tooBig = list.find((f) => f.size > 25 * 1024 * 1024);
    if (tooBig) return toast.error(`« ${tooBig.name} » dépasse 25 Mo.`);
    const form = new FormData();
    form.append("section", section);
    list.forEach((f) => form.append("files", f));
    setUploading(true);
    try {
      await api.post("/api/admin/photos", form);
      toast.success(`${list.length} photo${list.length > 1 ? "s ajoutées" : " ajoutée"} à la galerie ${sectionLabels[section]}.`);
      changed();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const visible = photos.filter((p) => filter === "all" || p.section === filter);

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <PillTabs label="Filtrer par page" items={filters} value={filter} onChange={setFilter} />
        <div className="flex items-center gap-2 text-[13px] text-umber">
          Légendes en
          <LangSwitch value={lang} onChange={setLang} />
        </div>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          upload(e.dataTransfer.files);
        }}
        className={cn(
          "mb-7 rounded-2xl border-2 border-dashed bg-cream p-8 text-center transition-colors",
          dragging ? "border-sage-dark bg-moss-light/40" : "border-khaki",
        )}
      >
        <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading} className="mx-auto flex flex-col items-center">
          <Icon name="upload" size={30} className="mb-2.5 text-sage" />
          <span className="mb-1 text-sm font-semibold text-ink">
            {uploading ? "Envoi en cours…" : "Glissez vos photos ici, ou cliquez pour parcourir"}
          </span>
          <span className="text-[13px] text-stone">JPG, PNG ou WebP, 25 Mo maximum — redimensionnées et optimisées automatiquement. Pensez au format 4:3 pour un rendu homogène.</span>
        </button>
        <input ref={inputRef} type="file" accept={ACCEPT} multiple hidden onChange={(e) => e.target.files && upload(e.target.files)} />
        <div className="mt-4 flex items-center justify-center gap-2 text-[13px] text-umber">
          {filter === "all" ? (
            <>
              <label htmlFor="upload-section">Ajouter à la galerie :</label>
              <select
                id="upload-section"
                value={uploadSection}
                onChange={(e) => setUploadSection(e.target.value as PhotoSection)}
                className="rounded-lg border border-line-strong bg-sand px-2 py-1"
              >
                {Object.entries(sectionLabels).map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            </>
          ) : (
            <span>Les photos seront ajoutées à la galerie « {sectionLabels[filter]} ».</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(230px,100%),1fr))] gap-5">
        {visible.map((p) => (
          <PhotoCard key={p.id} photo={p} lang={lang} onChanged={changed} />
        ))}
      </div>
    </>
  );
}
