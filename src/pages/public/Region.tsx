import { PageHero } from "@/components/site/page-hero";
import { Accent, SectionTitle } from "@/components/site/ornaments";
import { SitePhoto } from "@/components/site/site-photo";
import { useExtraPhotos, usePageText, usePhoto } from "@/providers/site-data-provider";
import { Typo } from "@/lib/format";

const sights = [
  { slot: "region.barneville", title: "Barneville-Carteret", text: "Station prisée des plaisanciers." },
  { slot: "region.hague", title: "La Hague", text: "Le bout du monde du Cotentin." },
  { slot: "region.cherbourg", title: "Cherbourg", text: "« Port des Amériques », Cité de la Mer et son sous-marin nucléaire." },
  { slot: "region.barfleur", title: "Barfleur", text: "Classé « plus beau village de France », réputé pour ses moules blanches." },
  { slot: "region.gatteville", title: "Phare de Gatteville", text: "2e plus grand phare de France." },
  { slot: "region.racine", title: "Port Racine", text: "Le plus petit port de France." },
  { slot: "region.vauban", title: "Tours Vauban", text: "Inscrites au patrimoine mondial de l'UNESCO." },
  { slot: "region.saint-vaast", title: "Saint-Vaast-la-Hougue", text: "Dégustation des huîtres locales sur le port." },
];

const memory = [
  { title: "Plages du Débarquement", text: "Cimetière américain de Colleville, port artificiel d'Arromanches, Mémorial de Caen." },
  { title: "Sainte-Mère-Église", text: "Célèbre pour son parachutiste suspendu au clocher." },
  { title: "Tapisserie de Bayeux", text: "La broderie du XIe siècle, à ne pas manquer." },
  { title: "Valognes", text: "Surnommée le « petit Versailles normand »." },
];

const activities = [
  { title: "Voile & planche à voile", text: "École de voile et club nautique à Barneville-Carteret (optimist, catamaran, planche)." },
  { title: "Randonnée & VTT", text: "Sentiers autour de la Lande de Lessay." },
  { title: "Vélo & char à voile", text: "Location de vélos, char à voile à Bretteville-sur-Ay." },
  { title: "Karting", text: "Circuit de karting à Lessay." },
  { title: "Parc du Cotentin et du Bessin", text: "Nature protégée, entre marais et bocage." },
  { title: "Zoo de Champrepus", text: "Une sortie familiale à moins d'une heure." },
];

const MontIllustration = () => (
  <svg viewBox="0 0 420 300" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 block h-full w-full" aria-hidden="true">
    <rect width="420" height="300" fill="#A8B89C" />
    <rect y="190" width="420" height="110" fill="#8FA885" />
    <path d="M150 195 L185 120 L200 150 L215 95 L235 140 L260 195 Z" fill="#6E8864" />
    <rect x="193" y="75" width="8" height="22" fill="#6E8864" />
    <path d="M189 78 L197 58 L205 78 Z" fill="#6E8864" />
    <circle cx="197" cy="54" r="2.5" fill="#6E8864" />
    <path d="M0 230 Q60 215 120 230 T240 230 T360 230 T420 225 L420 300 L0 300 Z" fill="#7E9574" opacity="0.5" />
  </svg>
);

const MaloIllustration = () => (
  <svg viewBox="0 0 420 300" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 block h-full w-full" aria-hidden="true">
    <rect width="420" height="300" fill="#7E9574" />
    <rect y="190" width="420" height="110" fill="#6E8864" />
    <rect x="60" y="150" width="300" height="55" fill="#5C7853" />
    {[60, 96, 132, 168, 204, 240, 276, 312, 342].map((x) => (
      <rect key={x} x={x} y="138" width="18" height="14" fill="#5C7853" />
    ))}
    <rect x="320" y="90" width="10" height="60" fill="#5C7853" />
    <path d="M318 90 L325 72 L332 90 Z" fill="#5C7853" />
    <circle cx="325" cy="80" r="3" fill="#F3DDB8" opacity="0.85" />
  </svg>
);

function FeatureTile({ slot, title, text, overlay, illustration }: { slot: string; title: string; text: string; overlay: string; illustration: React.ReactNode }) {
  const photo = usePhoto(slot);
  return (
    <div className="relative flex min-h-[300px] flex-[1_1_420px] items-center justify-center overflow-hidden text-cream">
      {photo?.url ? <img src={photo.url} alt={photo.alt} className="photo-warm absolute inset-0 h-full w-full object-cover" /> : illustration}
      <div className="absolute inset-0" style={{ background: overlay }} />
      {!photo?.url && (
        <span className="absolute right-[18px] top-[18px] z-[2] rounded-[14px] bg-ink/45 px-2.5 py-[5px] text-[11px] uppercase tracking-[1px]">
          Illustration — {title}
        </span>
      )}
      <div className="relative z-[2] p-8 text-center">
        <h3 className="font-serif text-[22px] font-medium">{title}</h3>
        <p className="mt-2.5 text-sm text-[#F6EEDC]">{text}</p>
      </div>
    </div>
  );
}

export function Region() {
  const text = usePageText("region");
  const extras = useExtraPhotos("region");

  return (
    <>
      <PageHero
        eyebrow="La Manche, Normandie"
        title={text("heroTitle")}
        subtitle={text("heroSubtitle")}
        photoSlot="region.hero"
        placeholderLabel="Côte du Cotentin"
      />

      <section className="px-gutter pb-12 pt-20">
        <div className="mx-auto max-w-[1200px]">
          <SectionTitle className="mb-3">À voir dans le Cotentin</SectionTitle>
          <Accent className="mb-5" />
          <p className="mb-10 max-w-[640px] text-umber">{text("intro")}</p>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(260px,100%),1fr))] gap-6">
            {sights.map((s) => (
              <div key={s.slot} className="overflow-hidden rounded-2xl bg-sand shadow-[0_2px_10px_rgba(43,42,37,0.06)]">
                <SitePhoto slot={s.slot} className="aspect-[16/10] border-0" />
                <div className="p-[18px]">
                  <h3 className="mb-1.5 text-[15px] font-semibold">{s.title}</h3>
                  <p className="text-[13px] text-umber">
                    <Typo text={s.text} />
                  </p>
                </div>
              </div>
            ))}
            {extras.map((p) => (
              <div key={p.id} className="aspect-[16/10] overflow-hidden rounded-2xl">
                <img src={p.url!} alt={p.alt} loading="lazy" className="photo-warm block h-full w-full object-cover" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-gutter bg-sand py-16">
        <div className="mx-auto max-w-[1200px]">
          <h2 className="mb-8 font-serif text-[26px] font-medium">Mémoire &amp; histoire</h2>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(260px,100%),1fr))] gap-6">
            {memory.map((m) => (
              <div key={m.title} className="rounded-[14px] bg-cream p-[22px]">
                <h3 className="mb-2 text-[15px] font-semibold">{m.title}</h3>
                <p className="text-[13px] leading-relaxed text-umber">
                  <Typo text={m.text} />
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="flex flex-wrap">
        <FeatureTile
          slot="region.mont"
          title="Mont-Saint-Michel"
          text="Classé au patrimoine mondial de l'UNESCO."
          overlay="rgba(126,149,116,0.4)"
          illustration={<MontIllustration />}
        />
        <FeatureTile
          slot="region.saint-malo"
          title="Saint-Malo"
          text="La cité corsaire, en Ille-et-Vilaine."
          overlay="rgba(94,120,83,0.4)"
          illustration={<MaloIllustration />}
        />
      </section>

      <section className="px-gutter py-16">
        <div className="mx-auto max-w-[1100px]">
          <h2 className="mb-3 font-serif text-2xl font-medium">Les îles Anglo-Normandes</h2>
          <p className="max-w-[720px] text-[15px] leading-[1.75] text-ink-soft">{text("islands")}</p>
        </div>
      </section>

      <section className="px-gutter bg-sand pb-24 pt-12">
        <div className="mx-auto max-w-[1200px]">
          <h2 className="mb-8 font-serif text-[26px] font-medium">Activités sportives &amp; nature</h2>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(260px,100%),1fr))] gap-5">
            {activities.map((a) => (
              <div key={a.title} className="rounded-[14px] bg-cream p-5">
                <h3 className="mb-1.5 text-sm font-semibold">{a.title}</h3>
                <p className="text-[13px] text-umber">{a.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
