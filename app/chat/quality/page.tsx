"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LightBulbIcon, BellIcon, ArrowLeftIcon } from "@heroicons/react/24/outline"
import Link from "next/link"
import { useSettings } from "@/components/settings-provider"

const translations = {
  ar: {
    comingSoon: "قريباً",
    qualityTitle: "تقييم جودة النقاش",
    description: "نعمل على نظام ذكي لتقييم جودة المحادثات وتقديم اقتراحات لتحسين التواصل.",
    features: "الميزات القادمة:",
    feature1: "تقييم تلقائي لجودة النقاش (1-10)",
    feature2: "تحليل نقاط القوة والضعف",
    feature3: "اقتراحات ذكية لتحسين التواصل",
    feature4: "تتبع تطور جودة النقاش عبر الوقت",
    feature5: "مقاييس متقدمة للمشاركة والتفاعل",
    notifyMe: "أخبرني عند الإطلاق",
    backHome: "العودة للرئيسية",
  },
  en: {
    comingSoon: "Coming Soon",
    qualityTitle: "Discussion Quality Assessment",
    description:
      "We're building an intelligent system to evaluate conversation quality and provide improvement suggestions.",
    features: "Upcoming Features:",
    feature1: "Automatic discussion quality rating (1-10)",
    feature2: "Strengths and weaknesses analysis",
    feature3: "Smart suggestions for better communication",
    feature4: "Track quality evolution over time",
    feature5: "Advanced engagement and interaction metrics",
    notifyMe: "Notify Me When Ready",
    backHome: "Back to Home",
  },
  fr: {
    comingSoon: "Bientôt disponible",
    qualityTitle: "Évaluation de la qualité des discussions",
    description:
      "Nous développons un système intelligent pour évaluer la qualité des conversations et suggérer des améliorations.",
    features: "Fonctionnalités à venir:",
    feature1: "Évaluation automatique de la qualité (1-10)",
    feature2: "Analyse des forces et faiblesses",
    feature3: "Suggestions intelligentes pour améliorer la communication",
    feature4: "Suivi de l'évolution de la qualité",
    feature5: "Métriques avancées d'engagement",
    notifyMe: "Me notifier au lancement",
    backHome: "Retour à l'accueil",
  },
}

export default function QualityComingSoonPage() {
  const { language } = useSettings()
  const t = translations[language as keyof typeof translations]

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-muted/20">
      <Card className="max-w-2xl w-full shadow-2xl border-2 transition-all hover:shadow-3xl">
        <CardHeader className="text-center space-y-4 pb-8">
          <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
            <LightBulbIcon className="w-10 h-10 text-primary" />
          </div>
          <div className="space-y-2">
            <div className="inline-block px-4 py-1 bg-accent/20 text-accent-foreground rounded-full text-sm font-medium">
              {t.comingSoon}
            </div>
            <CardTitle className="text-3xl font-bold">{t.qualityTitle}</CardTitle>
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
