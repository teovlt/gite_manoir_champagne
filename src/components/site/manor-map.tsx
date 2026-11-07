import { useState } from "react";
import { MapContainer, Marker, TileLayer, Tooltip } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { LocateFixed, Navigation } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useSiteData } from "@/providers/site-data-provider";
import { cn } from "@/lib/utils";

const pin = L.divIcon({
  className: "",
  html: `<svg width="38" height="50" viewBox="0 0 38 50" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M19 1C9.1 1 1 8.9 1 18.6 1 31.8 19 49 19 49s18-17.2 18-30.4C37 8.9 28.9 1 19 1z" fill="#BE6A45" stroke="#FBF7ED" stroke-width="2"/><circle cx="19" cy="18.5" r="6.5" fill="#FBF7ED"/></svg>`,
  iconSize: [38, 50],
  iconAnchor: [19, 49],
  tooltipAnchor: [0, -46],
});

/** Great-circle distance in km. */
function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

/** "49.17136, -1.45929" → 49°10'16.9"N 1°27'33.4"W */
function toDms(lat: number, lng: number) {
  const f = (v: number, pos: string, neg: string) => {
    const a = Math.abs(v);
    const d = Math.floor(a);
    const m = Math.floor((a - d) * 60);
    const s = ((a - d - m / 60) * 3600).toFixed(1);
    return `${d}°${String(m).padStart(2, "0")}'${s}"${v >= 0 ? pos : neg}`;
  };
  return `${f(lat, "N", "S")} ${f(lng, "E", "W")}`;
}

/** Interactive OpenStreetMap of the manor (no cookies, no API key). */
export function ManorMap({ className }: { className?: string }) {
  const { t } = useTranslation();
  const { location } = useSiteData().data.settings;
  return (
    <div className={cn("relative isolate overflow-hidden bg-wheat", className)}>
      <MapContainer
        key={`${location.lat},${location.lng}`}
        center={[location.lat, location.lng]}
        zoom={location.zoom}
        scrollWheelZoom={false}
        className="absolute inset-0 h-full w-full"
        attributionControl
      >
        <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" attribution={`<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">${t("map.attribution")}</a>`} maxZoom={19} />
        <Marker position={[location.lat, location.lng]} icon={pin} alt={t("map.marker")}>
          <Tooltip direction="top" permanent className="!rounded-full !border-0 !bg-ink !px-3 !py-1 !font-sans !text-xs !text-cream !shadow-md">
            {t("map.marker")}
          </Tooltip>
        </Marker>
      </MapContainer>
    </div>
  );
}

/** Directions: GPS apps + "from my location" + copyable coordinates. */
export function DirectionsPanel({ compact }: { compact?: boolean }) {
  const { t } = useTranslation();
  const { location } = useSiteData().data.settings;
  const [locating, setLocating] = useState(false);
  const [distance, setDistance] = useState<number | null>(null);
  const dest = `${location.lat},${location.lng}`;

  const apps = [
    { label: t("map.google"), href: `https://www.google.com/maps/dir/?api=1&destination=${dest}` },
    { label: t("map.waze"), href: `https://waze.com/ul?ll=${dest}&navigate=yes` },
    { label: t("map.apple"), href: `https://maps.apple.com/?daddr=${dest}` },
  ];

  const fromHere = () => {
    if (!("geolocation" in navigator)) return toast.error(t("map.geoError"));
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const me = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setDistance(Math.round(distanceKm(me, location)));
        window.open(
          `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${me.lat.toFixed(5)},${me.lng.toFixed(5)};${dest}`,
          "_blank",
          "noopener",
        );
      },
      () => {
        setLocating(false);
        toast.error(t("map.geoError"));
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 },
    );
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(dest);
      toast.success(t("map.copied"));
    } catch {
      /* ignore */
    }
  };

  const chip = "inline-flex items-center gap-1.5 rounded-full border border-line-strong bg-cream px-3.5 py-2 text-xs font-semibold text-umber transition-colors hover:border-clay hover:text-clay";

  return (
    <div className="flex flex-col gap-3">
      {!compact && <span className="text-xs uppercase tracking-[0.5px] text-umber">{t("map.directions")}</span>}
      <div className="flex flex-wrap gap-2">
        {apps.map((a) => (
          <a key={a.label} href={a.href} target="_blank" rel="noreferrer" className={chip}>
            <Navigation className="size-3.5" aria-hidden="true" />
            {a.label}
          </a>
        ))}
        <button type="button" onClick={fromHere} disabled={locating} className={chip}>
          <LocateFixed className="size-3.5" aria-hidden="true" />
          {locating ? t("map.locating") : t("map.fromHere")}
        </button>
      </div>
      {distance !== null && <p className="text-[13px] text-ink-soft">{t("map.distance", { km: distance })}</p>}
      <p className="flex flex-wrap items-center gap-2 text-[13px] text-stone">
        <span>
          {t("map.coords")} : <span className="font-mono text-umber">{location.lat.toFixed(5)}, {location.lng.toFixed(5)}</span> · {toDms(location.lat, location.lng)}
        </span>
        <button type="button" onClick={copy} className="font-semibold text-clay hover:underline">
          {t("map.copy")}
        </button>
      </p>
    </div>
  );
}
