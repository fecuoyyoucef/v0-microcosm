"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"

type Language = "ar" | "en" | "fr"
type FontSize = "small" | "medium" | "large"
type TranslationLanguage = "ar" | "en" | "fr"

interface SettingsContextType {
  language: Language
  setLanguage: (lang: Language) => void
  fontSize: FontSize
  setFontSize: (size: FontSize) => void
  timezone: string
  setTimezone: (tz: string) => void
  translationLanguage: TranslationLanguage
  setTranslationLanguage: (lang: TranslationLanguage) => void
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined)

const fontSizeClasses = {
  small: "text-sm",
  medium: "text-base",
  large: "text-lg",
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("ar")
  const [fontSize, setFontSizeState] = useState<FontSize>("medium")
  const [timezone, setTimezoneState] = useState("Auto")
  const [translationLanguage, setTranslationLanguageState] = useState<TranslationLanguage>("ar")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    // Load saved settings from localStorage
    const savedLang = localStorage.getItem("language") as Language | null
    const savedFontSize = localStorage.getItem("fontSize") as FontSize | null
    const savedTimezone = localStorage.getItem("timezone")
    const savedTranslationLang = localStorage.getItem("translationLanguage") as TranslationLanguage | null

    if (savedLang) setLanguageState(savedLang)
    if (savedFontSize) setFontSizeState(savedFontSize)
    if (savedTimezone) setTimezoneState(savedTimezone)
    if (savedTranslationLang) {
      setTranslationLanguageState(savedTranslationLang)
    } else if (savedLang) {
      // Default translation target to the user's UI language if not explicitly set
      setTranslationLanguageState(savedLang)
    }
  }, [])

  useEffect(() => {
    if (!mounted) return
    // Apply font size to document
    const root = document.documentElement
    root.classList.remove("text-sm", "text-base", "text-lg")
    root.classList.add(fontSizeClasses[fontSize])
  }, [fontSize, mounted])

  useEffect(() => {
    if (!mounted) return
    const html = document.documentElement
    html.lang = language
    html.dir = language === "ar" ? "rtl" : "ltr"

    // Force re-render by dispatching custom event
    window.dispatchEvent(new CustomEvent("languageChange", { detail: language }))
  }, [language, mounted])

  const setLanguage = (lang: Language) => {
    setLanguageState(lang)
    localStorage.setItem("language", lang)
    window.location.reload()
  }

  const setFontSize = (size: FontSize) => {
    setFontSizeState(size)
    localStorage.setItem("fontSize", size)
  }

  const setTimezone = (tz: string) => {
    setTimezoneState(tz)
    localStorage.setItem("timezone", tz)
  }

  const setTranslationLanguage = (lang: TranslationLanguage) => {
    setTranslationLanguageState(lang)
    localStorage.setItem("translationLanguage", lang)
  }

  return (
    <SettingsContext.Provider
      value={{
        language,
        setLanguage,
        fontSize,
        setFontSize,
        timezone,
        setTimezone,
        translationLanguage,
        setTranslationLanguage,
      }}
    >
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const context = useContext(SettingsContext)
  if (!context) {
    throw new Error("useSettings must be used within SettingsProvider")
  }
  return context
}
