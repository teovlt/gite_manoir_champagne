import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageHero } from "@/components/site/page-hero";
import { Accent } from "@/components/site/ornaments";
import { Field, TextAreaField, validateBooking } from "@/components/site/form-controls";
import { usePageText } from "@/providers/site-data-provider";
import { api } from "@/lib/api";

const shortDate = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

function describeDates(arrival: string, departure: string) {
  if (arrival && departure) return `Du ${shortDate(arrival)} au ${shortDate(departure)}`;
  if (arrival) return `À partir du ${shortDate(arrival)}`;
  return "";
}

function ContactForm() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const arrival = params.get("arrivee") ?? "";
  const departure = params.get("depart") ?? "";
  const fromBooking = Boolean(arrival || departure || params.get("adultes"));

  const [v, setV] = useState({
    nom: "",
    email: "",
    dates: describeDates(arrival, departure),
    adultes: params.get("adultes") ?? "",
    enfants: params.get("enfants") ?? "",
    message: params.get("message") ?? "",
    website: "", // honeypot
  });
  const [sending, setSending] = useState(false);
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setV({ ...v, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const error = validateBooking(v);
    if (error) return toast.error(t(error));
    setSending(true);
    try {
      await api.post("/api/requests", {
        name: v.nom,
        email: v.email,
        dates: v.dates,
        arrival: arrival || null,
        departure: departure || null,
        adults: v.adultes ? Number(v.adultes) : null,
        children: v.enfants ? Number(v.enfants) : null,
        message: v.message,
        website: v.website,
      });
      toast.success(t("booking.sent"));
      setV({ nom: "", email: "", dates: "", adultes: "", enfants: "", message: "", website: "" });
    } catch {
      toast.error(t("booking.error"));
    } finally {
      setSending(false);
    }
  };

  return (
    <form id="formulaire" onSubmit={submit} className="flex scroll-mt-6 flex-col gap-[18px] rounded-[18px] bg-sand p-[clamp(20px,4vw,32px)]">
      <p className="rounded-xl border border-line-strong bg-cream px-3.5 py-2.5 text-xs leading-relaxed text-stone">
        {fromBooking
          ? "Vos dates et le nombre de voyageurs ont été repris ci-dessous — il ne reste qu'à compléter vos coordonnées."
          : "Vous arrivez depuis le bandeau de réservation de l'accueil ? Vos dates et le nombre de voyageurs sont repris automatiquement ci-dessous."}
      </p>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(180px,100%),1fr))] gap-[18px]">
        <Field id="nom" label="Nom" type="text" required autoComplete="name" value={v.nom} onChange={set("nom")} />
        <Field id="email" label="E-mail" type="email" required autoComplete="email" value={v.email} onChange={set("email")} />
      </div>
      <Field id="dates" label="Dates souhaitées" type="text" placeholder="Ex. du 12 au 19 juillet" value={v.dates} onChange={set("dates")} />
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(140px,100%),1fr))] gap-[18px]">
        <Field id="adultes-c" label="Adultes" type="number" min="1" value={v.adultes} onChange={set("adultes")} />
        <Field id="enfants-c" label="Enfants" type="number" min="0" value={v.enfants} onChange={set("enfants")} />
      </div>
      <TextAreaField id="message-c" label="Votre message" rows={4} required value={v.message} onChange={set("message")} />
      <div className="hidden" aria-hidden="true">
        <label htmlFor="website">Ne pas remplir</label>
        <input id="website" tabIndex={-1} autoComplete="off" value={v.website} onChange={set("website")} />
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" variant="clay" size="pillMd" className="px-8" disabled={sending}>
          {sending ? "Envoi…" : "Envoyer le message"}
        </Button>
        <a href="/demande-reservation.pdf" download className="flex items-center gap-1.5 text-xs tracking-[0.5px] text-umber hover:text-clay">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 3v12" />
            <path d="M7 10l5 5 5-5" />
            <path d="M4 19h16" />
          </svg>
          ou téléchargez le PDF à nous retourner
        </a>
      </div>
    </form>
  );
}

export function Contact() {
  const text = usePageText("contact");
  const phone = text("phone");
  const share = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <>
      <PageHero eyebrow="Nous écrire" title="Contact & accès" minHeight={360} />

      <section className="px-gutter py-20">
        <div className="mx-auto grid max-w-[1200px] grid-cols-[repeat(auto-fit,minmax(min(360px,100%),1fr))] gap-14">
          <div>
            <h2 className="mb-5 font-serif text-2xl font-medium">Loïc &amp; Maryline Courteille</h2>
            <p className="mb-6 text-[15px] leading-[1.8] text-ink-soft">{text("intro")}</p>
            <div className="flex flex-col gap-3.5 text-[15px] text-ink">
              <span>
                <strong>Adresse&nbsp;:</strong>
                <br />2 rue La Champagne
                <br />
                50190 Millières, Manche
                <br />
                Normandie
              </span>
              <span>
                <strong>Téléphone&nbsp;:</strong>{" "}
                <a href={`tel:${phone.replace(/[^\d+]/g, "").replace("+330", "+33")}`} className="text-clay">
                  {phone}
                </a>
              </span>
              <span>
                <strong>E-mail&nbsp;:</strong>{" "}
                <a href="#formulaire" className="text-clay">
                  transmis via le formulaire
                </a>
              </span>
            </div>
            <div className="mt-7 flex flex-wrap gap-3">
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(share)}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-line-strong px-3.5 py-2 text-xs text-umber hover:text-clay"
              >
                Partager · Facebook
              </a>
              <a
                href={`mailto:?subject=${encodeURIComponent("Manoir de la Champagne")}&body=${encodeURIComponent(share)}`}
                className="rounded-full border border-line-strong px-3.5 py-2 text-xs text-umber hover:text-clay"
              >
                Partager · E-mail
              </a>
            </div>
          </div>

          <ContactForm />
        </div>
      </section>

      <section className="flex flex-wrap">
        <div className="relative aspect-[4/3] flex-[1_1_480px] overflow-hidden bg-wheat">
          <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 block h-full w-full" aria-hidden="true">
            <rect width="400" height="300" fill="#F1E6CC" />
            <rect x="30" y="40" width="90" height="70" fill="#EADFC2" />
            <rect x="150" y="20" width="70" height="100" fill="#EADFC2" />
            <rect x="260" y="50" width="100" height="60" fill="#EADFC2" />
            <rect x="40" y="165" width="100" height="90" fill="#EADFC2" />
            <rect x="220" y="175" width="120" height="80" fill="#EADFC2" />
            <rect x="170" y="150" width="60" height="50" fill="#C9D4BE" />
            <rect x="0" y="120" width="400" height="18" fill="#FBF7ED" />
            <rect x="185" y="0" width="18" height="300" fill="#FBF7ED" />
            <rect x="0" y="235" width="400" height="14" fill="#FBF7ED" />
            <path d="M200 96 c-15 0-25 11-25 25 0 19 25 44 25 44s25-25 25-44c0-14-10-25-25-25z" fill="#BE6A45" />
            <circle cx="200" cy="122" r="9" fill="#F1E6CC" />
          </svg>
          <a
            href="https://www.openstreetmap.org/search?query=2%20rue%20La%20Champagne%2C%2050190%20Milli%C3%A8res"
            target="_blank"
            rel="noreferrer"
            className="absolute bottom-3 right-3.5 rounded-[10px] bg-ink/55 px-[9px] py-1 text-[10px] uppercase tracking-[0.5px] text-cream hover:text-cream"
          >
            Carte illustrative · ouvrir le plan ↗
          </a>
        </div>
        <div className="px-gutter flex flex-[1_1_480px] flex-col justify-center gap-4 bg-sand py-16">
          <h2 className="font-serif text-2xl font-medium">Comment venir</h2>
          <Accent />
          <ul className="flex flex-col gap-3 text-[15px] text-ink-soft">
            <li>
              <strong>En voiture&nbsp;:</strong> {text("byCar")}
            </li>
            <li>
              <strong>En train&nbsp;:</strong> {text("byTrain")}
            </li>
            <li>
              <strong>Depuis la mer&nbsp;:</strong> {text("bySea")}
            </li>
          </ul>
          <p className="mt-2 text-[13px] text-stone">Un plan d'accès détaillé sera transmis après réservation.</p>
        </div>
      </section>
    </>
  );
}
