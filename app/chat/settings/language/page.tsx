"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Globe, AlertCircle } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useSettings } from "@/components/settings-provider"
import { Alert, AlertDescription } from "@/components/ui/alert"

const translations = {
  ar: {
    title: "اللغة والمنطقة",
    subtitle: "اختر لغتك والمنطقة الزمنية",
    language: "اللغة",
    languageDesc: "اختر اللغة المفضلة لك",
    applied: "تم تطبيق اللغة تلقائياً",
    reloadNote: "سيتم إعادة تحميل الصفحة لتطبيق التغييرات",
    timezone: "المنطقة الزمنية",
    timezoneDesc: "حدد منطقتك الزمنية",
    auto: "تلقائي",
    egypt: "مصر (UTC+2)",
    gulf: "الخليج (UTC+3)",
    morocco: "المغرب (UTC+1)",
    algeria: "الجزائر (UTC+1)",
  },
  en: {
    title: "Language & Region",
    subtitle: "Choose your language and timezone",
    language: "Language",
    languageDesc: "Choose your preferred language",
    applied: "Language applied automatically",
    reloadNote: "Page will reload to apply changes",
    timezone: "Timezone",
    timezoneDesc: "Select your timezone",
    auto: "Automatic",
    egypt: "Egypt (UTC+2)",
    gulf: "Gulf (UTC+3)",
    morocco: "Morocco (UTC+1)",
    algeria: "Algeria (UTC+1)",
  },
  fr: {
    title: "Langue et Région",
    subtitle: "Choisissez votre langue et fuseau horaire",
    language: "Langue",
    languageDesc: "Choisissez votre langue préférée",
    applied: "Langue appliquée automatiquement",
    reloadNote: "La page sera rechargée pour appliquer les modifications",
    timezone: "Fuseau horaire",
    timezoneDesc: "Sélectionnez votre fuseau horaire",
    auto: "Automatique",
    egypt: "Égypte (UTC+2)",
    gulf: "Golfe (UTC+3)",
    morocco: "Maroc (UTC+1)",
    algeria: "Algérie (UTC+1)",
  },
}

export default function LanguageSettingsPage() {
  const { language, setLanguage, timezone, setTimezone } = useSettings()
  const t = translations[language]

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Globe className="w-6 h-6 text-primary" />
          {t.title}
        </h1>
        <p className="text-muted-foreground mt-1">{t.subtitle}</p>
      </div>

      {/* Language Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t.language}</CardTitle>
          <CardDescription>{t.languageDesc}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Select value={language} onValueChange={(v) => setLanguage(v as "ar" | "en" | "fr")}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ar">
                <span className="flex items-center gap-2">🇸🇦 العربية</span>
              </SelectItem>
              <SelectItem value="en">
                <span className="flex items-center gap-2">🇺🇸 English</span>
              </SelectItem>
              <SelectItem value="fr">
                <span className="flex items-center gap-2">🇫🇷 Français</span>
              </SelectItem>
            </SelectContent>
          </Select>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{t.reloadNote}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Timezone Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t.timezone}</CardTitle>
          <CardDescription>{t.timezoneDesc}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Select value={timezone} onValueChange={setTimezone}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Auto">{t.auto}</SelectItem>
              <SelectItem value="UTC+1">{t.algeria}</SelectItem>
              <SelectItem value="UTC+2">{t.egypt}</SelectItem>
              <SelectItem value="UTC+3">{t.gulf}</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>
    </div>
  )
}
