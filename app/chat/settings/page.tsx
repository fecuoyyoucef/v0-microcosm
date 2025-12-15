"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Settings, User, Bell, Lock, MessageSquare, Globe, Palette } from "lucide-react"
import Link from "next/link"
import { useSettings } from "@/components/settings-provider"

const translations = {
  ar: {
    settings: "الإعدادات",
    settingsDesc: "إدارة حسابك وتفضيلات التطبيق",
    account: "الحساب",
    accountDesc: "إدارة معلومات حسابك والأمان",
    notifications: "الإشعارات",
    notificationsDesc: "تخصيص تفضيلات الإشعارات",
    privacy: "الخصوصية",
    privacyDesc: "إعدادات الخصوصية والأمان",
    chats: "المحادثات",
    chatsDesc: "إعدادات الخلايا والرسائل",
    language: "اللغة",
    languageDesc: "تغيير لغة التطبيق",
    appearance: "المظهر",
    appearanceDesc: "تخصيص شكل التطبيق",
  },
  en: {
    settings: "Settings",
    settingsDesc: "Manage your account and app preferences",
    account: "Account",
    accountDesc: "Manage your account information and security",
    notifications: "Notifications",
    notificationsDesc: "Customize notification preferences",
    privacy: "Privacy",
    privacyDesc: "Privacy and security settings",
    chats: "Chats",
    chatsDesc: "Cell and message settings",
    language: "Language",
    languageDesc: "Change app language",
    appearance: "Appearance",
    appearanceDesc: "Customize app appearance",
  },
  fr: {
    settings: "Paramètres",
    settingsDesc: "Gérer votre compte et les préférences de l'application",
    account: "Compte",
    accountDesc: "Gérer les informations de votre compte et la sécurité",
    notifications: "Notifications",
    notificationsDesc: "Personnaliser les préférences de notification",
    privacy: "Confidentialité",
    privacyDesc: "Paramètres de confidentialité et de sécurité",
    chats: "Discussions",
    chatsDesc: "Paramètres de cellule et de messages",
    language: "Langue",
    languageDesc: "Changer la langue de l'application",
    appearance: "Apparence",
    appearanceDesc: "Personnaliser l'apparence de l'application",
  },
}

export default function SettingsPage() {
  const { language } = useSettings()
  const t = translations[language]

  const settingsCategories = [
    {
      title: t.account,
      description: t.accountDesc,
      icon: User,
      href: "/chat/settings/account",
    },
    {
      title: t.notifications,
      description: t.notificationsDesc,
      icon: Bell,
      href: "/chat/settings/notifications",
    },
    {
      title: t.privacy,
      description: t.privacyDesc,
      icon: Lock,
      href: "/chat/settings/privacy",
    },
    {
      title: t.chats,
      description: t.chatsDesc,
      icon: MessageSquare,
      href: "/chat/settings/chats",
    },
    {
      title: t.language,
      description: t.languageDesc,
      icon: Globe,
      href: "/chat/settings/language",
    },
    {
      title: t.appearance,
      description: t.appearanceDesc,
      icon: Palette,
      href: "/chat/settings/appearance",
    },
  ]

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Settings className="w-8 h-8" />
            {t.settings}
          </h1>
          <p className="text-muted-foreground mt-2">{t.settingsDesc}</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {settingsCategories.map((category) => (
            <Link key={category.href} href={category.href}>
              <Card className="hover:bg-accent transition-colors cursor-pointer h-full">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <category.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{category.title}</CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription>{category.description}</CardDescription>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
