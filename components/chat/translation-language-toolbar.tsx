"use client"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Languages } from "lucide-react"
import { useSettings } from "@/components/settings-provider"

const LANGUAGE_LABELS: Record<"ar" | "en" | "fr", { native: string; menu: Record<"ar" | "en" | "fr", string> }> = {
  ar: {
    native: "AR",
    menu: { ar: "العربية", en: "Arabic", fr: "Arabe" },
  },
  en: {
    native: "EN",
    menu: { ar: "الإنجليزية", en: "English", fr: "Anglais" },
  },
  fr: {
    native: "FR",
    menu: { ar: "الفرنسية", en: "French", fr: "Français" },
  },
}

const HEADING: Record<"ar" | "en" | "fr", string> = {
  ar: "ترجم إلى",
  en: "Translate to",
  fr: "Traduire en",
}

const TOOLTIP: Record<"ar" | "en" | "fr", string> = {
  ar: "لغة الترجمة المفضلة",
  en: "Preferred translation language",
  fr: "Langue de traduction préférée",
}

export function TranslationLanguageToolbar() {
  const { language, translationLanguage, setTranslationLanguage } = useSettings()
  const uiLang = language as "ar" | "en" | "fr"
  const current = (translationLanguage ?? "ar") as "ar" | "en" | "fr"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-xl hover:bg-primary/10 hover:text-primary transition-colors relative"
          title={TOOLTIP[uiLang]}
          aria-label={TOOLTIP[uiLang]}
        >
          <Languages className="h-4 w-4" />
          <span
            aria-hidden="true"
            className="absolute -bottom-0.5 -end-0.5 text-[8px] font-bold bg-primary text-primary-foreground rounded px-1 leading-tight"
          >
            {LANGUAGE_LABELS[current].native}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel>{HEADING[uiLang]}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup
          value={current}
          onValueChange={(value) => setTranslationLanguage(value as "ar" | "en" | "fr")}
        >
          <DropdownMenuRadioItem value="ar">{LANGUAGE_LABELS.ar.menu[uiLang]}</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="en">{LANGUAGE_LABELS.en.menu[uiLang]}</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="fr">{LANGUAGE_LABELS.fr.menu[uiLang]}</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
