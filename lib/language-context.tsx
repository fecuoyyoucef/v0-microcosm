"use client"

import { createContext, useContext, useState, type ReactNode } from "react"

type Language = "ar" | "en" | "fr"

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string) => string
}

const translations: Record<Language, Record<string, string>> = {
  ar: {
    user: "مستخدم",
    reply: "رد",
    copy: "نسخ",
    translate: "ترجمة",
    delete: "حذف",
    delete_message: "حذف الرسالة",
    confirm_delete_message: "هل أنت متأكد من حذف هذه الرسالة؟",
    cancel: "إلغاء",
    translating: "جاري الترجمة",
  },
  en: {
    user: "User",
    reply: "Reply",
    copy: "Copy",
    translate: "Translate",
    delete: "Delete",
    delete_message: "Delete Message",
    confirm_delete_message: "Are you sure you want to delete this message?",
    cancel: "Cancel",
    translating: "Translating",
  },
  fr: {
    user: "Utilisateur",
    reply: "Répondre",
    copy: "Copier",
    translate: "Traduire",
    delete: "Supprimer",
    delete_message: "Supprimer le message",
    confirm_delete_message: "Êtes-vous sûr de vouloir supprimer ce message?",
    cancel: "Annuler",
    translating: "Traduction",
  },
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>("ar")

  const t = (key: string) => {
    return translations[language][key] || key
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
