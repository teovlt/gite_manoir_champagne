import { config } from "./config.js";
import { getSetting, setSetting } from "./db.js";
import { renderHtml } from "./mail-html.js";

const SIGN_FR = "Loïc & Maryline Courteille\nManoir de la Champagne — 2 rue La Champagne, 50190 Millières";

/**
 * Every e-mail the site sends. Subjects and bodies use {{variables}}; the owners can override
 * them in Admin › Modèles d'e-mails (stored in settings.mailTemplates, by template and language).
 */
export const MAIL_TEMPLATES = {
  newRequest: {
    label: "Nouvelle demande de réservation",
    description: "Envoyé aux propriétaires (NOTIFY_EMAIL) quand un visiteur demande des dates. « Répondre » écrit directement au visiteur.",
    audience: "Propriétaires",
    langs: ["fr"],
    variables: {
      nom: "Nom du visiteur",
      email: "E-mail du visiteur",
      dates: "Dates demandées",
      voyageurs: "Adultes et enfants",
      langue: "Langue du site utilisée (FR, EN, DE)",
      message: "Message du visiteur",
      lien_admin: "Lien vers les demandes dans l'admin",
    },
    sample: {
      nom: "Claire Martin",
      email: "claire.martin@example.com",
      dates: "du 12 au 19 juillet 2027",
      voyageurs: "2 adulte(s), 1 enfant(s)",
      langue: "FR",
      message: "Bonjour, le gîte est-il disponible à ces dates ?",
    },
    defaults: {
      fr: {
        subject: "Nouvelle demande de réservation — {{nom}}",
        body: "Nom : {{nom}}\nE-mail : {{email}}\nDates : {{dates}}\nVoyageurs : {{voyageurs}}\nLangue : {{langue}}\n\n{{message}}\n\nRépondez directement à cet e-mail, ou gérez la demande sur {{lien_admin}}",
      },
    },
  },
  newQuestion: {
    label: "Nouvelle question",
    description: "Envoyé aux propriétaires quand un visiteur pose une question (sans dates) depuis la page Contact.",
    audience: "Propriétaires",
    langs: ["fr"],
    variables: {
      nom: "Nom du visiteur",
      email: "E-mail du visiteur",
      langue: "Langue du site utilisée (FR, EN, DE)",
      message: "Message du visiteur",
      lien_admin: "Lien vers les demandes dans l'admin",
    },
    sample: { nom: "Claire Martin", email: "claire.martin@example.com", langue: "FR", message: "Bonjour, les chiens sont-ils acceptés ?" },
    defaults: {
      fr: {
        subject: "Nouvelle question — {{nom}}",
        body: "Nom : {{nom}}\nE-mail : {{email}}\nLangue : {{langue}}\n\n{{message}}\n\nRépondez directement à cet e-mail, ou gérez la demande sur {{lien_admin}}",
      },
    },
  },
  ack: {
    label: "Accusé de réception au visiteur",
    description: "Réponse automatique envoyée au visiteur après sa demande ou sa question, dans la langue du site qu'il a utilisée.",
    audience: "Visiteurs",
    langs: ["fr", "en", "de"],
    variables: { nom: "Nom du visiteur" },
    sample: { nom: "Claire Martin" },
    defaults: {
      fr: {
        subject: "Votre demande au Manoir de la Champagne",
        body: `Bonjour {{nom}},\n\nNous avons bien reçu votre demande et vous répondrons très rapidement.\n\nÀ bientôt au manoir,\n${SIGN_FR}`,
      },
      en: {
        subject: "Your request to the Manoir de la Champagne",
        body: "Hello {{nom}},\n\nThank you, we have received your request and will get back to you very soon.\n\nSee you soon at the manor,\nLoïc & Maryline Courteille\nManoir de la Champagne — 2 rue La Champagne, 50190 Millières, France",
      },
      de: {
        subject: "Ihre Anfrage an das Manoir de la Champagne",
        body: "Guten Tag {{nom}},\n\nvielen Dank, wir haben Ihre Anfrage erhalten und melden uns in Kürze bei Ihnen.\n\nBis bald im Herrenhaus,\nLoïc & Maryline Courteille\nManoir de la Champagne — 2 rue La Champagne, 50190 Millières, Frankreich",
      },
    },
  },
  conflicts: {
    label: "Alerte de double réservation",
    description: "Envoyé aux propriétaires quand une plateforme (Abritel, Airbnb…) a des dates qui chevauchent un séjour déjà prévu.",
    audience: "Propriétaires",
    langs: ["fr"],
    variables: { liste: "Liste des chevauchements trouvés", lien_admin: "Lien vers le calendrier de l'admin" },
    sample: {
      liste:
        "• Airbnb : 14 juillet 2027 → 18 juillet 2027 (Reserved)\n  chevauche « Séjour Claire Martin » : 12 juillet 2027 → 19 juillet 2027",
    },
    defaults: {
      fr: {
        subject: "⚠ Double réservation possible — Manoir de la Champagne",
        body: "Bonjour,\n\nLa synchronisation des calendriers a trouvé des dates réservées sur une plateforme qui chevauchent un séjour déjà prévu :\n\n{{liste}}\n\nVérifiez et réglez la situation sur la plateforme concernée, puis consultez {{lien_admin}}",
      },
    },
  },
  passwordReset: {
    label: "Réinitialisation du mot de passe",
    description: "Lien envoyé à un compte de l'admin pour choisir un nouveau mot de passe (mot de passe oublié, ou demandé depuis Mon compte / Utilisateurs).",
    audience: "Comptes admin",
    langs: ["fr"],
    variables: { nom: "Nom du compte", lien: "Lien de réinitialisation (valable 1 heure)" },
    sample: { nom: "Maryline Courteille" },
    defaults: {
      fr: {
        subject: "Réinitialisation de votre mot de passe — Manoir de la Champagne",
        body: "Bonjour {{nom}},\n\nPour choisir un nouveau mot de passe, ouvrez ce lien (valable 1 heure) :\n{{lien}}\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez simplement cet e-mail.",
      },
    },
  },
  invitation: {
    label: "Invitation d'un nouveau compte",
    description: "Envoyé à une personne ajoutée dans Utilisateurs sans mot de passe provisoire, pour qu'elle choisisse le sien.",
    audience: "Comptes admin",
    langs: ["fr"],
    variables: { nom: "Nom de la personne invitée", invite_par: "Nom de la personne qui invite", lien: "Lien pour choisir le mot de passe (valable 7 jours)" },
    sample: { nom: "Maryline Courteille", invite_par: "Loïc Courteille" },
    defaults: {
      fr: {
        subject: "Votre accès à l'espace propriétaires — Manoir de la Champagne",
        body: "Bonjour {{nom}},\n\n{{invite_par}} vous a ouvert un accès à l'administration du site du Manoir de la Champagne.\nChoisissez votre mot de passe avec ce lien (valable 7 jours) :\n{{lien}}",
      },
    },
  },
  emailChange: {
    label: "Confirmation de changement d'e-mail",
    description: "Envoyé à la nouvelle adresse quand quelqu'un change l'e-mail de son propre compte, pour la confirmer.",
    audience: "Comptes admin",
    langs: ["fr"],
    variables: { nom: "Nom du compte", nouvel_email: "Nouvelle adresse", lien: "Lien de confirmation (valable 24 heures)" },
    sample: { nom: "Maryline Courteille", nouvel_email: "maryline@example.com" },
    defaults: {
      fr: {
        subject: "Confirmez votre nouvelle adresse — Manoir de la Champagne",
        body: "Bonjour {{nom}},\n\nVous avez demandé à utiliser {{nouvel_email}} pour vous connecter à l'administration du Manoir de la Champagne.\nConfirmez ce changement avec ce lien (valable 24 heures) :\n{{lien}}\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez simplement cet e-mail : votre adresse actuelle reste en place.",
      },
    },
  },
};

export const SUBJECT_MAX = 300;
export const BODY_MAX = 10000;

const getOverrides = () => getSetting("mailTemplates", {});

/** Replaces {{variable}} placeholders; unknown ones are left visible so a typo shows in the e-mail. */
export const fill = (text, vars) => text.replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (all, key) => (vars[key] ?? all).toString());

/** Current subject/body of a template in a language (the owners' version, else the default). */
export async function templateText(id, lang) {
  const tpl = MAIL_TEMPLATES[id];
  const l = tpl.langs.includes(lang) ? lang : tpl.langs[0];
  const custom = (await getOverrides())[id]?.[l];
  return { subject: custom?.subject || tpl.defaults[l].subject, body: custom?.body || tpl.defaults[l].body };
}

/** Fills a subject/body pair: plain text plus its branded HTML version. */
export function renderMail(subject, body, vars, lang = "fr") {
  const s = fill(subject, vars).replace(/\s*\n\s*/g, " ");
  const text = fill(body, vars);
  return { subject: s, text, html: renderHtml({ subject: s, text, lang }) };
}

export async function renderTemplate(id, lang, vars) {
  const tpl = MAIL_TEMPLATES[id];
  const l = tpl.langs.includes(lang) ? lang : tpl.langs[0];
  const { subject, body } = await templateText(id, l);
  return renderMail(subject, body, vars, l);
}

/** Example values for previews and test e-mails (links point at the real site). */
export function sampleVars(id) {
  const link = { emailChange: "confirmer-email", passwordReset: "reinitialiser", invitation: "reinitialiser" }[id];
  return {
    ...MAIL_TEMPLATES[id].sample,
    lien_admin: `${config.publicUrl}/admin/${id === "conflicts" ? "calendrier" : "demandes"}`,
    ...(link && { lien: `${config.publicUrl}/admin/${link}?token=exemple` }),
  };
}

/** Admin listing: definitions, defaults and the current overrides. */
export async function listTemplates() {
  const overrides = await getOverrides();
  return Object.entries(MAIL_TEMPLATES).map(([id, t]) => ({
    id,
    label: t.label,
    description: t.description,
    audience: t.audience,
    langs: t.langs,
    variables: Object.entries(t.variables).map(([key, label]) => ({ key, label })),
    sample: sampleVars(id),
    defaults: t.defaults,
    custom: Object.fromEntries(t.langs.filter((l) => overrides[id]?.[l]).map((l) => [l, overrides[id][l]])),
  }));
}

/** Saves a template; a text equal to the default (or empty) drops the override. */
export async function saveTemplate(id, lang, subject, body) {
  const tpl = MAIL_TEMPLATES[id];
  const overrides = await getOverrides();
  const def = tpl.defaults[lang];
  const next = { ...overrides, [id]: { ...(overrides[id] ?? {}) } };
  const same = (!subject.trim() || subject.trim() === def.subject) && (!body.trim() || body.trim() === def.body.trim());
  if (same) delete next[id][lang];
  else next[id][lang] = { subject: subject.trim() || def.subject, body: body.trim() ? body : def.body };
  if (!Object.keys(next[id]).length) delete next[id];
  await setSetting("mailTemplates", next);
}
