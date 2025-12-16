"use client"

import { createContext, useContext, useState, type ReactNode } from "react"

type Language = "ar" | "en" | "fr"

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string) => string
}

const translations = {
  ar: {
    "file.unsupported": "نوع الملف غير مدعوم",
    "file.tooLarge": "حجم الملف كبير جداً",
    "message.send": "إرسال",
    "message.reply": "رد",
  },
  en: {
    "file.unsupported": "File type not supported",
    "file.tooLarge": "File size too large",
    "message.send": "Send",
    "message.reply": "Reply",
  },
  fr: {
    "file.unsupported": "Type de fichier non pris en charge",
    "file.tooLarge": "Taille de fichier trop grande",
    "message.send": "Envoyer",
    "message.reply": "Répondre",
  },
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>("ar")

  const t = (key: string) => {
    return translations[language][key as keyof (typeof translations)["ar"]] || key
  }

  return <LanguageContext.Provider value={{ language, setLanguage, t }}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider")
  }
  return context
}
