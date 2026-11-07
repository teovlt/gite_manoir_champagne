import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import de from "../locales/de.json";
import en from "../locales/en.json";
import fr from "../locales/fr.json";
import { langFromPath } from "./locale";

i18n.use(initReactI18next).init({
  resources: {
    fr: { translation: fr },
    en: { translation: en },
    de: { translation: de },
  },
  // The language comes from the URL prefix (/, /en, /de) — see LangSync.
  lng: langFromPath(window.location.pathname),
  fallbackLng: "fr",
  interpolation: { escapeValue: false },
  returnObjects: true,
});

export default i18n;
