"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import {
  HomeIcon,
  PlusIcon,
  Cog6ToothIcon as SettingsIcon,
  BellIcon,
  SparklesIcon,
  TrophyIcon,
  MoonIcon,
  SunIcon,
  XMarkIcon as XIcon,
  ArrowRightStartOnRectangleIcon as LogOutIcon,
  QuestionMarkCircleIcon as HelpCircleIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  LinkIcon as Link2Icon,
} from "@heroicons/react/24/outline"
import type { Group, Profile } from "@/lib/types"
import { useTheme } from "next-themes"
import { useSettings } from "@/components/settings-provider"
import { FirebasePushProvider } from "@/components/notifications/firebase-push-provider"
import { NotificationBell } from "@/components/notifications/notification-bell"
import { ScrollProvider } from "@/lib/contexts/scroll-context"
import { TutorialShell } from "@/components/tutorial/tutorial-shell"

interface AppShellProps {
  children: React.ReactNode
  userId: string
  profile: Profile | null
  groups: Group[]
}

const translations = {
  ar: {
    home: "الرئيسية",
    search: "بحث...",
    searchPlaceholder: "اضغط ⌘K للبحث السريع",
    notifications: "الإشعارات",
    assistant: "المساعد الذكي",
    settings: "الإعدادات",
    profile: "الملف الشخصي",
    signOut: "تسجيل الخروج",
    newCell: "خلية جديدة",
    cells: "الخلايا",
    noResults: "لا توجد نتائج",
    goTo: "انتقل إلى",
    actions: "إجراءات",
    darkMode: "الوضع الداكن",
    lightMode: "الوضع الفاتح",
    explore: "استكشاف",
    achievements: "الإنجازات",
    help: "المساعدة",
    admin: "لوحة التحكم",
    directMessages: "الرسائل المباشرة",
    comingSoon: "قريباً",
    joinByInvite: "انضم بدعوة",
    inviteLinkPlaceholder: "الصق رابط الدعوة هنا...",
    join: "انضم",
    joining: "جاري الانضمام...",
    invalidInviteLink: "رابط الدعوة غير صالح",
  },
  en: {
    home: "Home",
    search: "Search...",
    searchPlaceholder: "Press ⌘K to quick search",
    notifications: "Notifications",
    assistant: "AI Assistant",
    settings: "Settings",
    profile: "Profile",
    signOut: "Sign Out",
    newCell: "New Cell",
    cells: "Cells",
    noResults: "No results",
    goTo: "Go to",
    actions: "Actions",
    darkMode: "Dark mode",
    lightMode: "Light mode",
    explore: "Explore",
    achievements: "Achievements",
    help: "Help",
    admin: "Admin Panel",
    directMessages: "Direct Messages",
    comingSoon: "Coming Soon",
    joinByInvite: "Join by Invite",
    inviteLinkPlaceholder: "Paste invite link here...",
    join: "Join",
    joining: "Joining...",
    invalidInviteLink: "Invalid invite link",
  },
  fr: {
    home: "Accueil",
    search: "Rechercher...",
    searchPlaceholder: "Appuyez ⌘K pour recherche rapide",
    notifications: "Notifications",
    assistant: "Assistant IA",
    settings: "Paramètres",
    profile: "Profil",
    signOut: "Déconnexion",
    newCell: "Nouvelle Cellule",
    cells: "Cellules",
    noResults: "Aucun résultat",
    goTo: "Aller à",
    actions: "Actions",
    darkMode: "Mode sombre",
    lightMode: "Mode clair",
    explore: "Explorer",
    achievements: "Succès",
    help: "Aide",
    admin: "Panneau Admin",
    directMessages: "Messages Directs",
    comingSoon: "Bientôt",
    joinByInvite: "Rejoindre par invitation",
    inviteLinkPlaceholder: "Collez le lien d'invitation ici...",
    join: "Rejoindre",
    joining: "En cours...",
    invalidInviteLink: "Lien d'invitation invalide",
  },
}

function AppShellContent({ children, userId, profile, groups }: AppShellProps) {
  const [commandOpen, setCommandOpen] = useState(false)
  const [unreadNotifications, setUnreadNotifications] = useState(0)
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({})
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [cellsExpanded, setCellsExpanded] = useState(true)
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false)
  const [inviteLink, setInviteLink] = useState("")
  const [isJoining, setIsJoining] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const supabase = createClient()
  const { theme, setTheme } = useTheme()
  const { language } = useSettings()
  const t = translations[language]
  const [isAdmin, setIsAdmin] = useState(false)
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)
  const [touchInToolbar, setTouchInToolbar] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const checkAdmin = async () => {
      const { data } = await supabase.from("profiles").select("role").eq("id", userId).single()
      setIsAdmin(data?.role === "admin" || data?.role === "owner")
    }
    checkAdmin()
  }, [userId, supabase])

  // Keyboard shortcut for command palette
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setCommandOpen((open) => !open)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  // Fetch notifications and unread counts
  const fetchUnreadData = useCallback(async () => {
    const [notifResult, unreadResult] = await Promise.all([
      supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("is_read", false),
      supabase.from("group_unread_counts").select("group_id, unread_count").eq("user_id", userId),
    ])

    setUnreadNotifications(notifResult.count || 0)

    if (unreadResult.data) {
      const counts: Record<string, number> = {}
      unreadResult.data.forEach((item) => {
        counts[item.group_id] = item.unread_count
      })
      setUnreadCounts(counts)
    }
  }, [userId, supabase])

  useEffect(() => {
    fetchUnreadData()

    // Real-time subscriptions
    const channel = supabase
      .channel("app-shell-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        fetchUnreadData,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "group_unread_counts", filter: `user_id=eq.${userId}` },
        fetchUnreadData,
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, supabase, fetchUnreadData])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/")
  }

  const handleJoinByInvite = async () => {
    setIsJoining(true)
    setInviteError(null)

    try {
      const urlPattern = /\/invite\/([a-zA-Z0-9-]+)/
      const match = inviteLink.match(urlPattern)

      if (!match || !match[1]) {
        setInviteError(t.invalidInviteLink)
        setIsJoining(false)
        return
      }

      const groupId = match[1]
      router.push(`/invite/${groupId}`)
      setIsInviteDialogOpen(false)
      setInviteLink("")
      setMobileMenuOpen(false)
    } catch (err) {
      console.error("Error joining by invite:", err)
      setInviteError(t.invalidInviteLink)
    } finally {
      setIsJoining(false)
    }
  }

  const getGroupColor = (name: string) => {
    const colors = [
      "from-blue-500 to-blue-600",
      "from-emerald-500 to-emerald-600",
      "from-violet-500 to-violet-600",
      "from-amber-500 to-amber-600",
      "from-rose-500 to-rose-600",
      "from-cyan-500 to-cyan-600",
    ]
    return colors[name.charCodeAt(0) % colors.length]
  }

  const isActiveGroup = (groupId: string) => pathname?.includes(groupId)

  const SidebarContent = ({ isMobile = false }: { isMobile?: boolean }) => (
    <div className="flex flex-col h-full">
      {/* User Profile Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10">
            <AvatarImage src={profile?.avatar_url || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary">
              {profile?.display_name?.charAt(0) || <XIcon className="w-4 h-4" />}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate">{profile?.display_name || "User"}</p>
            {profile?.username && <p className="text-xs text-muted-foreground truncate">@{profile.username}</p>}
          </div>
          <Button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            variant="ghost"
            size="icon"
            className="h-8 w-8"
          >
            {theme === "dark" ? <SunIcon className="h-4 w-4" /> : <MoonIcon className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Main Navigation */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {/* Quick Actions */}
          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {t.goTo}
          </div>

          <Link href="/chat" onClick={() => isMobile && setMobileMenuOpen(false)}>
            <Button variant={pathname === "/chat" ? "secondary" : "ghost"} className="w-full justify-start gap-3 h-10">
              <HomeIcon className="w-4 h-4" />
              {t.home}
            </Button>
          </Link>

          <div className="flex items-center gap-1">
            <Link
              href="/chat/notifications"
              onClick={() => isMobile && setMobileMenuOpen(false)}
              className="flex-1"
            >
              <Button variant="ghost" className="w-full justify-start gap-3 h-10 relative text-foreground">
                <BellIcon className="w-4 h-4" />
                {t.notifications}
                {unreadNotifications > 0 && (
                  <Badge className="mr-auto h-5 px-1.5 bg-destructive text-destructive-foreground">
                    {unreadNotifications > 99 ? "99+" : unreadNotifications}
                  </Badge>
                )}
              </Button>
            </Link>
            <NotificationBell userId={userId} />
          </div>

          <Link href="/chat/assistant" onClick={() => isMobile && setMobileMenuOpen(false)}>
            <Button variant="ghost" className="w-full justify-start gap-3 h-10">
              <SparklesIcon className="w-4 h-4 text-amber-500" />
              {t.assistant}
            </Button>
          </Link>

          <Link href="/chat/profile" onClick={() => isMobile && setMobileMenuOpen(false)}>
            <Button variant="ghost" className="w-full justify-start gap-3 h-10">
              <TrophyIcon className="w-4 h-4 text-amber-500" />
              {t.achievements}
            </Button>
          </Link>

          {/* Cells Section */}
          <div
            className="px-2 py-1.5 mt-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between cursor-pointer hover:bg-muted/50 rounded-md"
            onClick={() => setCellsExpanded(!cellsExpanded)}
          >
            <div className="flex items-center gap-1">
              {cellsExpanded ? <ChevronDownIcon className="w-3 h-3" /> : <ChevronUpIcon className="w-3 h-3" />}
              {t.cells}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5"
              onClick={(e) => {
                e.stopPropagation()
                router.push("/chat?new=true")
                isMobile && setMobileMenuOpen(false)
              }}
            >
              <PlusIcon className="w-3 h-3" />
            </Button>
          </div>

          {cellsExpanded && (
            <>
              {groups.map((group) => (
                <Link key={group.id} href={`/chat/${group.id}`} onClick={() => isMobile && setMobileMenuOpen(false)}>
                  <Button
                    variant={isActiveGroup(group.id) ? "secondary" : "ghost"}
                    className="w-full justify-start gap-3 h-10"
                  >
                    <Avatar className="w-5 h-5">
                      {group.avatar_url ? (
                        <AvatarImage src={group.avatar_url || "/placeholder.svg"} />
                      ) : (
                        <AvatarFallback
                          className={cn("text-[10px] text-white bg-gradient-to-br", getGroupColor(group.name))}
                        >
                          {group.name.substring(0, 2)}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <span className="truncate flex-1 text-right">{group.name}</span>
                    {unreadCounts[group.id] > 0 && (
                      <Badge className="h-5 px-1.5 bg-destructive text-destructive-foreground text-[10px]">
                        {unreadCounts[group.id]}
                      </Badge>
                    )}
                  </Button>
                </Link>
              ))}

              {groups.length === 0 && (
                <div className="px-3 py-6 text-center">
                  <XIcon className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">لا توجد خلايا</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2 bg-transparent"
                    onClick={() => router.push("/chat?new=true")}
                  >
                    <PlusIcon className="w-3 h-3 ml-1" />
                    {t.newCell}
                  </Button>
                </div>
              )}
            </>
          )}

          {/* Join by Invite button below cells list */}
          <Button
            onClick={() => setIsInviteDialogOpen(true)}
            variant="ghost"
            className="w-full justify-start gap-3 h-10 mt-1 text-muted-foreground hover:text-foreground"
          >
            <Link2Icon className="w-5 h-5" />
            <span className="truncate flex-1 text-right text-sm">{t.joinByInvite}</span>
          </Button>
        </div>
      </ScrollArea>

      {/* Bottom Actions */}
      <div className="p-2 border-t border-border space-y-1">
        {isAdmin && (
          <Link href="/admin" onClick={() => isMobile && setMobileMenuOpen(false)}>
            <Button variant="ghost" className="w-full justify-start gap-3 h-10 text-cyan-500">
              <XIcon className="w-4 h-4" />
              {t.admin}
            </Button>
          </Link>
        )}

        <Link href="/chat/settings" onClick={() => isMobile && setMobileMenuOpen(false)}>
          <Button variant="ghost" className="w-full justify-start gap-3 h-10">
            <SettingsIcon className="w-4 h-4" />
            {t.settings}
          </Button>
        </Link>

        <Link href="/chat/about" onClick={() => isMobile && setMobileMenuOpen(false)}>
          <Button variant="ghost" className="w-full justify-start gap-3 h-10">
            <HelpCircleIcon className="w-4 h-4" />
            حول التطبيق
          </Button>
        </Link>

        <Button
          variant="ghost"
          className="w-full justify-start gap-3 h-10 text-destructive hover:text-destructive"
          onClick={handleSignOut}
        >
          <LogOutIcon className="w-4 h-4" />
          {t.signOut}
        </Button>
      </div>
    </div>
  )

  const minSwipeDistance = 50

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
    const target = e.target as HTMLElement
    const isInPopover = target.closest('[role="dialog"]') || target.closest("[data-radix-popper-content-wrapper]")
    const isInToolbar = target.closest("[data-toolbar]") || target.closest("button")

    if (isInPopover || isInToolbar) {
      setTouchInToolbar(true)
      return
    }

    setTouchInToolbar(false)
  }

  const onTouchMove = (e: React.TouchEvent) => {
    if (touchInToolbar) return
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const onTouchEnd = () => {
    if (touchInToolbar) {
      setTouchInToolbar(false)
      return
    }

    if (!touchStart || !touchEnd) return

    const distance = touchStart - touchEnd
    const isRightSwipe = distance < -minSwipeDistance

    if (isRightSwipe) {
      setMobileMenuOpen(true)
    }

    setTouchStart(null)
    setTouchEnd(null)
  }

  return (
    <div
      className="relative h-screen flex bg-background overflow-hidden"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col bg-card border-l border-border">
        <SidebarContent />
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="flex-1 overflow-auto">{children}</div>

        {/* Mobile Sidebar */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetContent side="left" className="p-0 w-64">
            <SidebarContent isMobile={true} />
          </SheetContent>
        </Sheet>
      </main>
    </div>
  )
}

export function AppShell(props: AppShellProps) {
  return (
    <ScrollProvider>
      <FirebasePushProvider userId={props.userId}>
        <TutorialShell>
          <AppShellContent {...props} />
        </TutorialShell>
      </FirebasePushProvider>
    </ScrollProvider>
  )
}
