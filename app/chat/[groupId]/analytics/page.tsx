"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartBarIcon, BellIcon, ArrowLeftIcon } from "@heroicons/react/24/outline"
import Link from "next/link"
import { useSettings } from "@/components/settings-provider"
import { use } from "react"

const translations = {
  ar: {
    comingSoon: "قريباً",
    analyticsTitle: "التحليلات والإحصائيات",
    description: "نطور لوحة تحكم شاملة لتحليل نشاط الخلية ومشاركات الأعضاء بشكل تفصيلي.",
    features: "الميزات القادمة:",
    feature1: "رسوم بيانية تفاعلية للنشاط",
    feature2: "تحليل أنماط التواصل والمشاركة",
    feature3: "إحصائيات الأعضاء والتفاعلات",
    feature4: "تقارير أسبوعية وشهرية تلقائية",
    feature5: "تحليل ذكي للقرارات والمهام",
    notifyMe: "أخبرني عند الإطلاق",
    backToChat: "العودة للمحادثة",
  },
  en: {
    comingSoon: "Coming Soon",
    analyticsTitle: "Analytics & Insights",
    description: "We're developing a comprehensive dashboard to analyze cell activity and member participation.",
    features: "Upcoming Features:",
    feature1: "Interactive activity charts",
    feature2: "Communication and participation pattern analysis",
    feature3: "Member statistics and interactions",
    feature4: "Automated weekly and monthly reports",
    feature5: "Smart analysis of decisions and tasks",
    notifyMe: "Notify Me When Ready",
    backToChat: "Back to Chat",
  },
  fr: {
    comingSoon: "Bientôt disponible",
    analyticsTitle: "Analyses et statistiques",
    description: "Nous développons un tableau de bord complet pour analyser l'activité de la cellule.",
    features: "Fonctionnalités à venir:",
    feature1: "Graphiques interactifs d'activité",
    feature2: "Analyse des modèles de communication",
    feature3: "Statistiques des membres et interactions",
    feature4: "Rapports hebdomadaires et mensuels automatiques",
    feature5: "Analyse intelligente des décisions et tâches",
    notifyMe: "Me notifier au lancement",
    backToChat: "Retour au chat",
  },
}

export default function AnalyticsComingSoonPage({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = use(params)
  const { language } = useSettings()
  const t = translations[language as keyof typeof translations]

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-muted/20">
      <Card className="max-w-2xl w-full shadow-2xl border-2 transition-all hover:shadow-3xl">
        <CardHeader className="text-center space-y-4 pb-8">
          <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
            <ChartBarIcon className="w-10 h-10 text-primary" />
          </div>
          <div className="space-y-2">
            <div className="inline-block px-4 py-1 bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-full text-sm font-medium">
              {t.comingSoon}
            </div>
            <CardTitle className="text-3xl font-bold">{t.analyticsTitle}</CardTitle>
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
              {[t.feature1, t.feature2, t.feature3, t.feature4, t.feature5].map((feature, index) => (
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
              <Link href={`/chat/${groupId}`}>
                <ArrowLeftIcon className="w-5 h-5 mr-2" />
                {t.backToChat}
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
