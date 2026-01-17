"use client"

import { useSettings } from "@/components/settings-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Brain,
  Users,
  Layers,
  Vote,
  MessageSquare,
  Shield,
  Sparkles,
  Globe,
  Zap,
  Lock,
  Clock,
  ChevronLeft,
  BookOpen,
  Lightbulb,
  Rocket,
} from "lucide-react"
import Link from "next/link"
import Image from "next/image"

const translations = {
  ar: {
    back: "رجوع",
    about: "حول التطبيق",
    version: "الإصدار 1.0.0",
    tagline: "منصة تواصل ذكية تعيد تعريف طريقة تفاعلنا",

    whatIs: "ما هو Synaptic Space؟",
    whatIsDesc:
      "Synaptic Space هو تطبيق محادثة جماعية ذكي يساعدك على التواصل مع فريقك واتخاذ القرارات بطريقة منظمة وفعالة. فكر فيه كمساحة عمل ذكية حيث تتم جميع محادثاتك بطريقة منظمة ومدعومة بالذكاء الاصطناعي.",

    termsTitle: "المصطلحات الأساسية",
    terms: [
      {
        title: "الخلية (Cell)",
        description: "مجموعة أشخاص يعملون معاً على هدف مشترك. مثل فريق المشروع أو لجنة القرارات.",
      },
      {
        title: "الطبقات (Layers)",
        description:
          "ثلاث مستويات للرسائل: مهمة (للقرارات المهمة)، عادية (للحوارات اليومية)، خفية (للملاحظات الشخصية).",
      },
      {
        title: "التصويت (Voting)",
        description: "طريقة سريعة لاتخاذ قرار جماعي. تصويت على الخيارات وانظر النتيجة فوراً.",
      },
      {
        title: "المساعد الذكي (AI Assistant)",
        description: "بمساعدة الذكاء الاصطناعي، يلخص المحادثات ويساعدك على فهم النقاط المهمة.",
      },
    ],

    quickStart: "دليل البدء السريع",
    quickSteps: [
      { num: "1", title: "أنشئ خلية", desc: "اضغط على + وأنشئ خلية جديدة لفريقك" },
      { num: "2", title: "ادعُ الأعضاء", desc: "شارك رابط الخلية مع فريقك" },
      { num: "3", title: "ابدأ المحادثة", desc: "اكتب رسائل وصنفها حسب الأهمية" },
      { num: "4", title: "استخدم التصويت", desc: "عندما تحتاج قرار جماعي، أطلق تصويت" },
    ],

    useCases: "أمثلة واقعية للاستخدام",
    useCasesExamples: [
      {
        icon: Rocket,
        title: "فريق المشروع",
        description: "متابعة تقدم المشروع، تقسيم المهام، التصويت على القرارات التقنية",
        color: "bg-blue-500/10 text-blue-500",
      },
      {
        icon: Lightbulb,
        title: "لجنة البحث والتطوير",
        description: "مناقشة أفكار جديدة، تقييم الاقتراحات، اختيار أولويات العمل",
        color: "bg-purple-500/10 text-purple-500",
      },
      {
        icon: Users,
        title: "فريق إدارة المشاريع",
        description: "تنسيق العمل بين الفرق، متابعة الموارد، اتخاذ قرارات استراتيجية",
        color: "bg-green-500/10 text-green-500",
      },
    ],

    description:
      "Synaptic Space هو تطبيق تواصل مبتكر يجمع بين قوة الذكاء الاصطناعي ونظام الطبقات الفريد لتنظيم المحادثات وتسهيل اتخاذ القرارات الجماعية.",
    coreFeatures: "الميزات الأساسية",
    features: [
      {
        icon: Layers,
        title: "نظام الطبقات الذكي",
        description:
          "نظم رسائلك في ثلاث طبقات: المهمة للقرارات الحاسمة، العادية للمحادثات اليومية، والخفية للملاحظات الشخصية.",
        color: "bg-blue-500/10 text-blue-500",
      },
      {
        icon: Vote,
        title: "التصويت التفاعلي",
        description: "اتخذ قرارات جماعية بسهولة من خلال نظام تصويت متكامل يدعم خيارات متعددة ونتائج فورية.",
        color: "bg-green-500/10 text-green-500",
      },
      {
        icon: Brain,
        title: "الذكاء الاصطناعي",
        description: "مساعد ذكي يحلل المحادثات ويلخص النقاشات ويساعد في اتخاذ القرارات المعقدة.",
        color: "bg-purple-500/10 text-purple-500",
      },
      {
        icon: Users,
        title: "الخلايا التعاونية",
        description: "أنشئ خلايا للعمل الجماعي مع أدوار متعددة: مسؤول، مشرف، وعضو.",
        color: "bg-orange-500/10 text-orange-500",
      },
      {
        icon: MessageSquare,
        title: "التفاعل مع الرسائل",
        description: "رد على الرسائل، أضف تفاعلات مخصصة، وتابع المحادثات بسلاسة.",
        color: "bg-pink-500/10 text-pink-500",
      },
      {
        icon: Shield,
        title: "الأمان والخصوصية",
        description: "تشفير شامل وحماية متقدمة للبيانات مع التحكم الكامل في خصوصيتك.",
        color: "bg-red-500/10 text-red-500",
      },
    ],
    whyTitle: "لماذا Synaptic Space؟",
    whyItems: [
      { icon: Zap, text: "سرعة فائقة في الأداء" },
      { icon: Globe, text: "دعم متعدد اللغات (العربية، الإنجليزية، الفرنسية)" },
      { icon: Lock, text: "خصوصية وأمان على أعلى مستوى" },
      { icon: Clock, text: "تزامن فوري للرسائل" },
      { icon: Sparkles, text: "واجهة حديثة وسهلة الاستخدام" },
    ],
    techTitle: "التقنيات المستخدمة",
    techs: ["Next.js 15", "React 19", "Supabase", "Grok AI", "Tailwind CSS", "TypeScript"],
    copyright: "جميع الحقوق محفوظة",
    madeWith: "صُنع بـ ❤️ للمجتمع العربي",
  },
  en: {
    back: "Back",
    about: "About",
    version: "Version 1.0.0",
    tagline: "A smart communication platform redefining how we interact",

    whatIs: "What is Synaptic Space?",
    whatIsDesc:
      "Synaptic Space is a smart group communication app that helps you connect with your team and make decisions in an organized and effective way. Think of it as a smart workspace where all your conversations happen in an organized manner, powered by artificial intelligence.",

    termsTitle: "Key Terms",
    terms: [
      {
        title: "Cell",
        description: "A group of people working together on a shared goal. Like a project team or decision committee.",
      },
      {
        title: "Layers",
        description:
          "Three levels of messages: Important (for crucial decisions), Standard (for daily conversations), Shadow (for personal notes).",
      },
      {
        title: "Voting",
        description: "A quick way to make a group decision. Vote on options and see results instantly.",
      },
      {
        title: "AI Assistant",
        description: "With artificial intelligence, it summarizes conversations and helps you understand key points.",
      },
    ],

    quickStart: "Quick Start Guide",
    quickSteps: [
      { num: "1", title: "Create a Cell", desc: "Click + and create a new cell for your team" },
      { num: "2", title: "Invite Members", desc: "Share the cell link with your team" },
      { num: "3", title: "Start Chatting", desc: "Write messages and categorize them by importance" },
      { num: "4", title: "Use Voting", desc: "When you need a group decision, start a vote" },
    ],

    useCases: "Real-World Use Cases",
    useCasesExamples: [
      {
        icon: Rocket,
        title: "Project Team",
        description: "Track project progress, divide tasks, vote on technical decisions",
        color: "bg-blue-500/10 text-blue-500",
      },
      {
        icon: Lightbulb,
        title: "Research & Development",
        description: "Discuss new ideas, evaluate proposals, prioritize work",
        color: "bg-purple-500/10 text-purple-500",
      },
      {
        icon: Users,
        title: "Project Management",
        description: "Coordinate between teams, track resources, make strategic decisions",
        color: "bg-green-500/10 text-green-500",
      },
    ],

    description:
      "Synaptic Space is an innovative communication app that combines the power of AI with a unique layer system to organize conversations and facilitate collective decision-making.",
    coreFeatures: "Core Features",
    features: [
      {
        icon: Layers,
        title: "Smart Layer System",
        description:
          "Organize your messages in three layers: Important for crucial decisions, Standard for daily conversations, and Shadow for personal notes.",
        color: "bg-blue-500/10 text-blue-500",
      },
      {
        icon: Vote,
        title: "Interactive Voting",
        description:
          "Make group decisions easily with an integrated voting system supporting multiple options and instant results.",
        color: "bg-green-500/10 text-green-500",
      },
      {
        icon: Brain,
        title: "Artificial Intelligence",
        description:
          "A smart assistant that analyzes conversations, summarizes discussions, and helps with complex decisions.",
        color: "bg-purple-500/10 text-purple-500",
      },
      {
        icon: Users,
        title: "Collaborative Cells",
        description: "Create cells for teamwork with multiple roles: admin, moderator, and member.",
        color: "bg-orange-500/10 text-orange-500",
      },
      {
        icon: MessageSquare,
        title: "Message Interactions",
        description: "Reply to messages, add custom reactions, and follow conversations seamlessly.",
        color: "bg-pink-500/10 text-pink-500",
      },
      {
        icon: Shield,
        title: "Security & Privacy",
        description: "End-to-end encryption and advanced data protection with full control over your privacy.",
        color: "bg-red-500/10 text-red-500",
      },
    ],
    whyTitle: "Why Synaptic Space?",
    whyItems: [
      { icon: Zap, text: "Ultra-fast performance" },
      { icon: Globe, text: "Multi-language support (Arabic, English, French)" },
      { icon: Lock, text: "Top-level privacy and security" },
      { icon: Clock, text: "Real-time message sync" },
      { icon: Sparkles, text: "Modern and easy-to-use interface" },
    ],
    techTitle: "Technologies Used",
    techs: ["Next.js 15", "React 19", "Supabase", "Grok AI", "Tailwind CSS", "TypeScript"],
    copyright: "All rights reserved",
    madeWith: "Made with ❤️ for the community",
  },
  fr: {
    back: "Retour",
    about: "À propos",
    version: "Version 1.0.0",
    tagline: "Une plateforme de communication intelligente redéfinissant notre façon d'interagir",

    whatIs: "Qu'est-ce que Synaptic Space?",
    whatIsDesc:
      "Synaptic Space est une application de communication de groupe intelligente qui vous aide à communiquer avec votre équipe et à prendre des décisions de manière organisée et efficace. Pensez-y comme un espace de travail intelligent où toutes vos conversations se déroulent de manière organisée, alimentée par l'intelligence artificielle.",

    termsTitle: "Termes clés",
    terms: [
      {
        title: "Cellule",
        description:
          "Un groupe de personnes travaillant ensemble sur un objectif commun. Comme une équipe de projet ou un comité de décision.",
      },
      {
        title: "Couches",
        description:
          "Trois niveaux de messages: Important (pour les décisions cruciales), Standard (pour les conversations quotidiennes), Ombre (pour les notes personnelles).",
      },
      {
        title: "Vote",
        description:
          "Un moyen rapide de prendre une décision de groupe. Votez sur les options et voyez les résultats instantanément.",
      },
      {
        title: "Assistant IA",
        description:
          "Avec l'intelligence artificielle, il résume les conversations et vous aide à comprendre les points clés.",
      },
    ],

    quickStart: "Guide de démarrage rapide",
    quickSteps: [
      { num: "1", title: "Créer une cellule", desc: "Cliquez sur + et créez une nouvelle cellule pour votre équipe" },
      { num: "2", title: "Inviter les membres", desc: "Partagez le lien de la cellule avec votre équipe" },
      { num: "3", title: "Commencer à discuter", desc: "Écrivez des messages et classez-les par importance" },
      { num: "4", title: "Utiliser le vote", desc: "Quand vous avez besoin d'une décision de groupe, lancez un vote" },
    ],

    useCases: "Cas d'utilisation réels",
    useCasesExamples: [
      {
        icon: Rocket,
        title: "Équipe de projet",
        description: "Suivre la progression du projet, diviser les tâches, voter sur les décisions techniques",
        color: "bg-blue-500/10 text-blue-500",
      },
      {
        icon: Lightbulb,
        title: "Recherche et développement",
        description: "Discuter de nouvelles idées, évaluer les propositions, prioriser le travail",
        color: "bg-purple-500/10 text-purple-500",
      },
      {
        icon: Users,
        title: "Gestion de projet",
        description: "Coordonner les équipes, suivre les ressources, prendre des décisions stratégiques",
        color: "bg-green-500/10 text-green-500",
      },
    ],

    description:
      "Synaptic Space est une application de communication innovante qui combine la puissance de l'IA avec un système de couches unique pour organiser les conversations et faciliter la prise de décision collective.",
    coreFeatures: "Fonctionnalités principales",
    features: [
      {
        icon: Layers,
        title: "Système de couches intelligent",
        description:
          "Organisez vos messages en trois couches: Important pour les décisions cruciales, Standard pour les conversations quotidiennes, et Ombre pour les notes personnelles.",
        color: "bg-blue-500/10 text-blue-500",
      },
      {
        icon: Vote,
        title: "Vote interactif",
        description:
          "Prenez des décisions de groupe facilement avec un système de vote intégré supportant plusieurs options et résultats instantanés.",
        color: "bg-green-500/10 text-green-500",
      },
      {
        icon: Brain,
        title: "Intelligence Artificielle",
        description:
          "Un assistant intelligent qui analyse les conversations, résume les discussions et aide aux décisions complexes.",
        color: "bg-purple-500/10 text-purple-500",
      },
      {
        icon: Users,
        title: "Cellules collaboratives",
        description: "Créez des cellules pour le travail d'équipe avec plusieurs rôles: admin, modérateur et membre.",
        color: "bg-orange-500/10 text-orange-500",
      },
      {
        icon: MessageSquare,
        title: "Interactions de messages",
        description:
          "Répondez aux messages, ajoutez des réactions personnalisées et suivez les conversations facilement.",
        color: "bg-pink-500/10 text-pink-500",
      },
      {
        icon: Shield,
        title: "Sécurité et confidentialité",
        description:
          "Cryptage de bout en bout et protection avancée des données avec contrôle total sur votre vie privée.",
        color: "bg-red-500/10 text-red-500",
      },
    ],
    whyTitle: "Pourquoi Synaptic Space?",
    whyItems: [
      { icon: Zap, text: "Performance ultra-rapide" },
      { icon: Globe, text: "Support multilingue (Arabe, Anglais, Français)" },
      { icon: Lock, text: "Confidentialité et sécurité de haut niveau" },
      { icon: Clock, text: "Synchronisation en temps réel" },
      { icon: Sparkles, text: "Interface moderne et facile à utiliser" },
    ],
    techTitle: "Technologies utilisées",
    techs: ["Next.js 15", "React 19", "Supabase", "Grok AI", "Tailwind CSS", "TypeScript"],
    copyright: "Tous droits réservés",
    madeWith: "Fait avec ❤️ pour la communauté",
  },
}

export default function AboutPage() {
  const { language } = useSettings()
  const t = translations[language]

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border shrink-0">
        <div className="flex items-center gap-3 p-4">
          <Link href="/chat">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-lg font-semibold">{t.about}</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto p-4 pb-20 space-y-8">
          {/* Logo and App Info */}
          <div className="text-center space-y-4 py-6">
            <div className="relative w-24 h-24 mx-auto">
              <Image
                src="/icons/icon-512x512.png"
                alt="Synaptic Space"
                fill
                className="rounded-3xl shadow-2xl object-cover"
              />
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-cyan-400/20 to-blue-600/20" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                Synaptic Space
              </h1>
              <Badge variant="secondary" className="mt-2">
                {t.version}
              </Badge>
            </div>
            <p className="text-lg text-muted-foreground">{t.tagline}</p>
            <p className="text-sm text-muted-foreground leading-relaxed">{t.description}</p>
          </div>

          <Card className="overflow-hidden border-none bg-secondary/50">
            <CardContent className="p-6 space-y-3">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                {t.whatIs}
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{t.whatIsDesc}</p>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <h2 className="text-xl font-bold">{t.termsTitle}</h2>
            <div className="grid gap-3">
              {t.terms.map((term, index) => (
                <Card key={index} className="overflow-hidden border-none bg-secondary/30">
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-primary mb-1">{term.title}</h3>
                    <p className="text-sm text-muted-foreground">{term.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Rocket className="h-5 w-5 text-primary" />
              {t.quickStart}
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {t.quickSteps.map((step, index) => (
                <Card key={index} className="overflow-hidden border-none bg-secondary/30">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                        {step.num}
                      </div>
                      <h3 className="font-semibold text-sm">{step.title}</h3>
                    </div>
                    <p className="text-xs text-muted-foreground">{step.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-bold">{t.useCases}</h2>
            <div className="grid gap-3">
              {t.useCasesExamples.map((example, index) => (
                <Card key={index} className="overflow-hidden border-none bg-secondary/50">
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      <div className={`p-3 rounded-xl ${example.color} shrink-0`}>
                        <example.icon className="h-6 w-6" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="font-semibold">{example.title}</h3>
                        <p className="text-sm text-muted-foreground">{example.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Core Features */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              {t.coreFeatures}
            </h2>
            <div className="grid gap-3">
              {t.features.map((feature, index) => (
                <Card key={index} className="overflow-hidden border-none bg-secondary/50">
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      <div className={`p-3 rounded-xl ${feature.color} shrink-0`}>
                        <feature.icon className="h-6 w-6" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="font-semibold">{feature.title}</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Why Synaptic Space */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold">{t.whyTitle}</h2>
            <div className="grid grid-cols-1 gap-2">
              {t.whyItems.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors"
                >
                  <item.icon className="h-5 w-5 text-primary shrink-0" />
                  <span className="text-sm">{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Technologies */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold">{t.techTitle}</h2>
            <div className="flex flex-wrap gap-2">
              {t.techs.map((tech, index) => (
                <Badge key={index} variant="outline" className="px-3 py-1.5 text-sm bg-secondary/50">
                  {tech}
                </Badge>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="text-center space-y-2 pt-8 border-t border-border">
            <p className="text-sm text-muted-foreground">© 2025 Synaptic Space. {t.copyright}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
