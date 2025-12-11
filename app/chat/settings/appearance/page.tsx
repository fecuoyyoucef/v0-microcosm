"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Palette, Monitor, Moon, Sun, Check, Globe } from "lucide-react"
import { useTheme } from "next-themes"
import { useSettings } from "@/components/settings-provider"

const translations = {
  ar: {
    title: "المظهر والمواضيع",
    subtitle: "تخصيص مظهر التطبيق وفقاً لتفضيلاتك",
    themeTitle: "اختيار المظهر",
    themeDesc: "اختر المظهر الذي تفضله",
    light: "فاتح",
    dark: "داكن",
    auto: "تلقائي",
    savedAuto: "يتم حفظ الإعداد تلقائياً",
    fontTitle: "حجم الخط",
    fontDesc: "اختر حجم الخط المناسب لك",
    small: "صغير",
    medium: "متوسط",
    large: "كبير",
    langTitle: "اللغة",
    langDesc: "اختر لغة التطبيق",
    arabic: "العربية",
    english: "English",
    french: "Français",
  },
  en: {
    title: "Appearance & Themes",
    subtitle: "Customize the app appearance to your preferences",
    themeTitle: "Choose Theme",
    themeDesc: "Select your preferred theme",
    light: "Light",
    dark: "Dark",
    auto: "Auto",
    savedAuto: "Settings are saved automatically",
    fontTitle: "Font Size",
    fontDesc: "Choose your preferred font size",
    small: "Small",
    medium: "Medium",
    large: "Large",
    langTitle: "Language",
    langDesc: "Choose the app language",
    arabic: "العربية",
    english: "English",
    french: "Français",
  },
  fr: {
    title: "Apparence et Thèmes",
    subtitle: "Personnalisez l'apparence de l'application",
    themeTitle: "Choisir le Thème",
    themeDesc: "Sélectionnez votre thème préféré",
    light: "Clair",
    dark: "Sombre",
    auto: "Auto",
    savedAuto: "Les paramètres sont sauvegardés automatiquement",
    fontTitle: "Taille de Police",
    fontDesc: "Choisissez votre taille de police préférée",
    small: "Petit",
    medium: "Moyen",
    large: "Grand",
    langTitle: "Langue",
    langDesc: "Choisissez la langue de l'application",
    arabic: "العربية",
    english: "English",
    french: "Français",
  },
}

export default function AppearanceSettingsPage() {
  const { theme, setTheme } = useTheme()
  const { fontSize, setFontSize, language, setLanguage } = useSettings()
  const t = translations[language]

  return (
    <div className="p-6 space-y-6 max-w-2xl overflow-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Palette className="w-6 h-6 text-primary" />
          {t.title}
        </h1>
        <p className="text-muted-foreground mt-1">{t.subtitle}</p>
      </div>

      {/* Language Selection - Added language selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Globe className="w-5 h-5" />
            {t.langTitle}
          </CardTitle>
          <CardDescription>{t.langDesc}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <Button
              variant={language === "ar" ? "default" : "outline"}
              onClick={() => setLanguage("ar")}
              className="h-16 flex flex-col items-center justify-center gap-1 relative"
            >
              <span className="text-lg">🇸🇦</span>
              <span className="text-xs">{t.arabic}</span>
              {language === "ar" && <Check className="w-4 h-4 absolute top-2 left-2 text-green-500" />}
            </Button>
            <Button
              variant={language === "en" ? "default" : "outline"}
              onClick={() => setLanguage("en")}
              className="h-16 flex flex-col items-center justify-center gap-1 relative"
            >
              <span className="text-lg">🇺🇸</span>
              <span className="text-xs">{t.english}</span>
              {language === "en" && <Check className="w-4 h-4 absolute top-2 left-2 text-green-500" />}
            </Button>
            <Button
              variant={language === "fr" ? "default" : "outline"}
              onClick={() => setLanguage("fr")}
              className="h-16 flex flex-col items-center justify-center gap-1 relative"
            >
              <span className="text-lg">🇫🇷</span>
              <span className="text-xs">{t.french}</span>
              {language === "fr" && <Check className="w-4 h-4 absolute top-2 left-2 text-green-500" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Theme Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t.themeTitle}</CardTitle>
          <CardDescription>{t.themeDesc}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <Button
              variant={theme === "light" ? "default" : "outline"}
              onClick={() => setTheme("light")}
              className="h-24 flex flex-col items-center justify-center gap-2 relative"
            >
              <Sun className="w-6 h-6" />
              <span className="text-xs">{t.light}</span>
              {theme === "light" && <Check className="w-4 h-4 absolute top-2 left-2 text-green-500" />}
            </Button>
            <Button
              variant={theme === "dark" ? "default" : "outline"}
              onClick={() => setTheme("dark")}
              className="h-24 flex flex-col items-center justify-center gap-2 relative"
            >
              <Moon className="w-6 h-6" />
              <span className="text-xs">{t.dark}</span>
              {theme === "dark" && <Check className="w-4 h-4 absolute top-2 left-2 text-green-500" />}
            </Button>
            <Button
              variant={theme === "system" ? "default" : "outline"}
              onClick={() => setTheme("system")}
              className="h-24 flex flex-col items-center justify-center gap-2 relative"
            >
              <Monitor className="w-6 h-6" />
              <span className="text-xs">{t.auto}</span>
              {theme === "system" && <Check className="w-4 h-4 absolute top-2 left-2 text-green-500" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground text-center">{t.savedAuto}</p>
        </CardContent>
      </Card>

      <Separator />

      {/* Font Size */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t.fontTitle}</CardTitle>
          <CardDescription>{t.fontDesc}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            {[
              { value: "small" as const, label: t.small, preview: "أ" },
              { value: "medium" as const, label: t.medium, preview: "أ" },
              { value: "large" as const, label: t.large, preview: "أ" },
            ].map((option) => (
              <Button
                key={option.value}
                variant={fontSize === option.value ? "default" : "outline"}
                onClick={() => setFontSize(option.value)}
                className="w-full justify-between"
              >
                <span>{option.label}</span>
                <span
                  className={option.value === "small" ? "text-sm" : option.value === "medium" ? "text-base" : "text-lg"}
                >
                  {option.preview}
                </span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
