"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { MagnifyingGlassIcon, BellIcon, ArrowLeftIcon } from "@heroicons/react/24/outline"
import Link from "next/link"
import { useSettings } from "@/components/settings-provider"

const translations = {
  ar: {
    comingSoon: "قريباً",
    searchTitle: "البحث المتقدم",
    description: "نعمل على تطوير نظام بحث قوي يتيح لك العثور على الرسائل والخلايا والمستخدمين بسهولة.",
    features: "الميزات القادمة:",
    feature1: "بحث سريع في جميع المحادثات",
    feature2: "تصفية متقدمة حسب التاريخ والمرسل",
    feature3: "بحث ذكي باستخدام الذكاء الاصطناعي",
    feature4: "حفظ عمليات البحث المتكررة",
    notifyMe: "أخبرني عند الإطلاق",
    backHome: "العودة للرئيسية",
    subscribed: "تم! سنخبرك عند الإطلاق",
  },
  en: {
    comingSoon: "Coming Soon",
    searchTitle: "Advanced Search",
    description: "We're building a powerful search system that lets you find messages, cells, and users with ease.",
    features: "Upcoming Features:",
    feature1: "Quick search across all conversations",
    feature2: "Advanced filters by date and sender",
    feature3: "AI-powered smart search",
    feature4: "Save frequent searches",
    notifyMe: "Notify Me When Ready",
    backHome: "Back to Home",
    subscribed: "Done! We'll notify you when it launches",
  },
  fr: {
    comingSoon: "Bientôt disponible",
    searchTitle: "Recherche avancée",
    description:
      "Nous développons un système de recherche puissant pour trouver facilement des messages, cellules et utilisateurs.",
    features: "Fonctionnalités à venir:",
    feature1: "Recherche rapide dans toutes les conversations",
    feature2: "Filtres avancés par date et expéditeur",
    feature3: "Recherche intelligente avec IA",
    feature4: "Sauvegarder les recherches fréquentes",
    notifyMe: "Me notifier au lancement",
    backHome: "Retour à l'accueil",
    subscribed: "Fait! Nous vous préviendrons lors du lancement",
  },
}

export default function SearchComingSoonPage() {
  const { language } = useSettings()
  const t = translations[language as keyof typeof translations]

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-muted/20">
      <Card className="max-w-2xl w-full shadow-2xl border-2 transition-all hover:shadow-3xl">
        <CardHeader className="text-center space-y-4 pb-8">
          <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
            <MagnifyingGlassIcon className="w-10 h-10 text-primary" />
          </div>
          <div className="space-y-2">
            <div className="inline-block px-4 py-1 bg-accent/20 text-accent-foreground rounded-full text-sm font-medium">
              {t.comingSoon}
            </div>
            <CardTitle className="text-3xl font-bold">{t.searchTitle}</CardTitle>
          </div>
          <CardDescription className="text-lg">{t.description}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="space-y-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <span className="w-1 h-6 bg-primary rounded-full" />
              {t.features}
            </h3>
            <ul className="space-y-3">
              {[t.feature1, t.feature2, t.feature3, t.feature4].map((feature, index) => (
                <li key={index} className="flex items-start gap-3 text-muted-foreground">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-primary">{index + 1}</span>
                  </div>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button className="flex-1 h-11" size="lg">
              <BellIcon className="w-5 h-5 mr-2" />
              {t.notifyMe}
            </Button>
            <Button variant="outline" className="flex-1 h-11 bg-transparent" size="lg" asChild>
              <Link href="/chat">
                <ArrowLeftIcon className="w-5 h-5 mr-2" />
                {t.backHome}
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
