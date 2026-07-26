import { createContext, useContext, useState, ReactNode } from "react";

export type Language = "en" | "uz" | "ru";

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (en: string, uz?: string, ru?: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const SUPPORTED: Language[] = ["en", "uz", "ru"];

/**
 * The language a first-time visitor lands in.
 *
 * This platform is built for Uzbekistan, so Uzbek is the default — English was
 * greeting every new arrival in a country where it is the third language. A
 * returning visitor keeps whatever they picked, and a browser that asks for
 * Russian gets Russian, so the default only decides the case we cannot infer.
 */
function initialLanguage(): Language {
  const saved = localStorage.getItem("cdctf_lang") as Language | null;
  if (saved && SUPPORTED.includes(saved)) return saved;

  for (const tag of navigator.languages ?? [navigator.language]) {
    const base = (tag || "").slice(0, 2).toLowerCase();
    if (base === "ru") return "ru";
    if (base === "uz") return "uz";
    if (base === "en") return "en";
  }
  return "uz";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Language>(initialLanguage);

  const changeLang = (newLang: Language) => {
    setLang(newLang);
    localStorage.setItem("cdctf_lang", newLang);
  };

  const t = (en: string, uz?: string, ru?: string): string => {
    if (lang === "uz" && uz) return uz;
    if (lang === "ru" && ru) return ru;
    return en;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang: changeLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLang must be used within LanguageProvider");
  return context;
}
