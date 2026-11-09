import { useEffect, useState } from "react";
import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AdminCard, AdminH2, AdminLabel, InfoNote, adminInputClass } from "@/components/admin/admin-ui";
import { useSiteData } from "@/providers/site-data-provider";
import { api } from "@/lib/api";
import type { SiteSettings } from "@/lib/types";
import { cn } from "@/lib/utils";

const pin = L.divIcon({
  className: "",
  html: `<svg width="34" height="44" viewBox="0 0 38 50" xmlns="http://www.w3.org/2000/svg"><path d="M19 1C9.1 1 1 8.9 1 18.6 1 31.8 19 49 19 49s18-17.2 18-30.4C37 8.9 28.9 1 19 1z" fill="#BE6A45" stroke="#FBF7ED" stroke-width="2"/><circle cx="19" cy="18.5" r="6.5" fill="#FBF7ED"/></svg>`,
  iconSize: [34, 44],
  iconAnchor: [17, 43],
});

/** "49,17" or "49.17" → 49.17; anything incomplete → null. */
const parseCoord = (raw: string) => {
  const v = raw.trim().replace(",", ".");
  if (!/^-?\d+(\.\d+)?$/.test(v)) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

function ClickToPlace({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) });
  return null;
}

export function AdminSettings() {
  const { data, refresh } = useSiteData();
  const [form, setForm] = useState<SiteSettings>(data.settings);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    api
      .get<SiteSettings>("/api/admin/settings")
      .then(setForm)
      .catch((e) => toast.error(e.message));
  }, []);

  const setLoc = (patch: Partial<SiteSettings["location"]>) => setForm((f) => ({ ...f, location: { ...f.location, ...patch } }));

  // The GPS fields keep what is typed ("-1.", "49,17", empty…); the map only moves on a valid number.
  const [typed, setTyped] = useState({
    lat: String(data.settings.location.lat),
    lng: String(data.settings.location.lng),
    zoom: String(data.settings.location.zoom),
  });
  useEffect(() => {
    const { lat, lng, zoom } = form.location;
    setTyped((t) => ({
      lat: parseCoord(t.lat) === lat ? t.lat : String(lat),
      lng: parseCoord(t.lng) === lng ? t.lng : String(lng),
      zoom: parseCoord(t.zoom) === zoom ? t.zoom : String(zoom),
    }));
  }, [form.location]);
  const typeCoord = (k: "lat" | "lng" | "zoom", raw: string) => {
    setTyped((t) => ({ ...t, [k]: raw }));
    const n = parseCoord(raw);
    const ok = n !== null && (k === "lat" ? Math.abs(n) <= 90 : k === "lng" ? Math.abs(n) <= 180 : n >= 5 && n <= 18);
    if (ok) setLoc({ [k]: k === "zoom" ? Math.round(n) : n });
  };

  /** Address lookup through OpenStreetMap's geocoder (Nominatim). */
  const geocode = async () => {
    const q = search || form.address;
    if (!q) return;
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`, {
        headers: { "Accept-Language": "fr" },
      });
      const [hit] = (await res.json()) as { lat: string; lon: string; display_name: string }[];
      if (!hit) return toast.error("Adresse introuvable — placez le repère en cliquant sur la carte.");
      setLoc({ lat: Number(hit.lat), lng: Number(hit.lon) });
      toast.success(`Trouvé : ${hit.display_name}`);
    } catch {
      toast.error("Recherche impossible pour le moment.");
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      setForm(await api.put<SiteSettings>("/api/admin/settings", form));
      await refresh();
      toast.success("Paramètres enregistrés.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const { lat, lng, zoom } = form.location;

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(min(440px,100%),1fr))] gap-7">
      <AdminCard className="flex flex-col gap-4 p-6">
        <AdminH2>Coordonnées affichées sur le site</AdminH2>
        <div className="flex flex-col gap-1.5">
          <AdminLabel htmlFor="s-phone">Téléphone</AdminLabel>
          <input
            id="s-phone"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className={adminInputClass}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <AdminLabel htmlFor="s-address">Adresse (rue, code postal + ville)</AdminLabel>
          <input
            id="s-address"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            className={adminInputClass}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <AdminLabel htmlFor="s-abritel">Lien vers votre annonce / vos avis Abritel</AdminLabel>
          <input
            id="s-abritel"
            placeholder="https://www.abritel.fr/location-vacances/p…"
            value={form.abritelUrl}
            onChange={(e) => setForm({ ...form, abritelUrl: e.target.value })}
            className={adminInputClass}
          />
          <p className="text-[12px] text-stone">Laissé vide, le bouton « Lire tous les avis sur Abritel » est masqué.</p>
        </div>
        <InfoNote>
          Ces informations apparaissent dans le pied de page, la page Contact et les itinéraires GPS, dans les trois langues.
        </InfoNote>
      </AdminCard>

      <AdminCard className="flex flex-col gap-4 p-6">
        <AdminH2>Position du manoir (carte & GPS)</AdminH2>
        <div className="flex gap-2">
          <input
            aria-label="Rechercher une adresse"
            placeholder={form.address}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), geocode())}
            className={adminInputClass}
          />
          <Button type="button" variant="outline" className="h-auto rounded-[14px] px-4" onClick={geocode}>
            Chercher
          </Button>
        </div>
        <div className="relative isolate aspect-[4/3] overflow-hidden rounded-[14px] border border-line-strong">
          <MapContainer
            center={[lat, lng]}
            zoom={zoom}
            className="absolute inset-0 h-full w-full"
            key={`${lat.toFixed(3)}-${lng.toFixed(3)}`}
          >
            <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap" />
            <Marker
              position={[lat, lng]}
              icon={pin}
              draggable
              eventHandlers={{ dragend: (e) => setLoc({ lat: e.target.getLatLng().lat, lng: e.target.getLatLng().lng }) }}
            />
            <ClickToPlace onPick={(la, ln) => setLoc({ lat: la, lng: ln })} />
          </MapContainer>
        </div>
        <p className="text-[12px] text-stone">
          Cliquez sur la carte ou faites glisser le repère pour ajuster la position exacte de l'entrée.
        </p>
        <div className="grid grid-cols-3 gap-3">
          <div className="flex flex-col gap-1.5">
            <AdminLabel htmlFor="s-lat">Latitude</AdminLabel>
            <input
              id="s-lat"
              inputMode="decimal"
              value={typed.lat}
              onChange={(e) => typeCoord("lat", e.target.value)}
              className={cn(adminInputClass, parseCoord(typed.lat) === null && "border-clay")}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <AdminLabel htmlFor="s-lng">Longitude</AdminLabel>
            <input
              id="s-lng"
              inputMode="decimal"
              value={typed.lng}
              onChange={(e) => typeCoord("lng", e.target.value)}
              className={cn(adminInputClass, parseCoord(typed.lng) === null && "border-clay")}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <AdminLabel htmlFor="s-zoom">Zoom</AdminLabel>
            <input
              id="s-zoom"
              type="number"
              min={5}
              max={18}
              value={typed.zoom}
              onChange={(e) => typeCoord("zoom", e.target.value)}
              className={adminInputClass}
            />
          </div>
        </div>
      </AdminCard>

      <div className="sticky bottom-0 col-span-full flex items-center gap-3 border-t border-line-strong bg-parchment/95 py-4 backdrop-blur">
        <Button type="button" variant="clay" size="pillMd" className="px-8" disabled={saving} onClick={save}>
          {saving ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </div>
    </div>
  );
}
