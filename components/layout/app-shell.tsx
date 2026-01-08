"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
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
import { BottomNavProvider, useBottomNav } from "@/lib/contexts/bottom-nav-context"

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

function BottomNavController() {
  const { setIsVisible } = useBottomNav()
  const [lastScrollY, setLastScrollY] = useState(0)
  const [isScrollable, setIsScrollable] = useState(false)

  useEffect(() => {
    let ticking = false
    const threshold = 10 // minimum scroll distance to trigger

    const handleScroll = (e: Event) => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const target = e.target as HTMLElement

          // Check if content is scrollable
          const scrollable = target.scrollHeight > target.clientHeight
          setIsScrollable(scrollable)

          // Only hide/show if content is scrollable
          if (scrollable) {
            const currentScrollY = target.scrollTop
            const scrollDiff = currentScrollY - lastScrollY

            if (Math.abs(scrollDiff) > threshold) {
              if (scrollDiff > 0) {
                // Scrolling down - hide nav
                setIsVisible(false)
              } else {
                // Scrolling up - show nav
                setIsVisible(true)
              }
              setLastScrollY(currentScrollY)
            }
          } else {
            // Not scrollable - always show nav
            setIsVisible(true)
          }

          ticking = false
        })
        ticking = true
      }
    }

    // Listen to scroll events from chat containers
    const scrollContainers = document.querySelectorAll(".chat-scroll-container")
    scrollContainers.forEach((container) => {
      container.addEventListener("scroll", handleScroll, { passive: true })
    })

    // Check initial scrollable state
    setTimeout(() => {
      scrollContainers.forEach((container) => {
        const scrollable = container.scrollHeight > container.clientHeight
        setIsScrollable(scrollable)
        if (!scrollable) {
          setIsVisible(true)
        }
      })
    }, 100)

    return () => {
      scrollContainers.forEach((container) => {
        container.removeEventListener("scroll", handleScroll)
      })
    }
  }, [lastScrollY, setIsVisible])

  return null
}

function BottomNavigationBar({
  pathname,
  unreadCounts,
  userId,
  profile,
  t,
}: {
  pathname: string
  unreadCounts: Record<string, number>
  userId: string
  profile: Profile | null
  t: typeof translations.ar
}) {
  const { isVisible } = useBottomNav()
  const { theme, setTheme } = useTheme()
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [cellsExpanded, setCellsExpanded] = useState(true)
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false)
  const [inviteLink, setInviteLink] = useState("")
  const [isJoining, setIsJoining] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [groups, setGroups] = useState<Group[]>([])
  const [isAdmin, setIsAdmin] = useState(false)

  const handleSignOut = async () => {
    await createClient().auth.signOut()
    router.push("/")
  }

  const handleJoinByInvite = async () => {
    if (!inviteLink.trim()) return

    setIsJoining(true)
    setInviteError(null)

    try {
      const urlPattern = /\/invite\/([a-zA-Z0-9-]+)/
      const match = inviteLink.match(urlPattern)

      if (!match || !match[1]) {
        setInviteError(translations.ar.invalidInviteLink)
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
      setInviteError(translations.ar.invalidInviteLink)
    } finally {
      setIsJoining(false)
    }
  }

  const isActiveGroup = (groupId: string) => pathname?.includes(groupId)

  useEffect(() => {
    const checkAdmin = async () => {
      const { data } = await createClient().from("profiles").select("role").eq("id", userId).single()
      setIsAdmin(data?.role === "admin" || data?.role === "owner")
    }
    checkAdmin()
  }, [userId])

  return (
    <nav
      className={cn(
        "border-t border-border bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80",
        "transition-transform duration-300 ease-in-out md:hidden",
        !isVisible && "translate-y-full",
      )}
    >
      {/* Top bar */}
      <div className="p-2 border-b border-border">
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

          <Link href="/chat" onClick={() => setMobileMenuOpen(false)}>
            <Button variant={pathname === "/chat" ? "secondary" : "ghost"} className="w-full justify-start gap-3 h-10">
              <HomeIcon className="w-4 h-4" />
              {t.home}
            </Button>
          </Link>

          <Link href="/chat/notifications" onClick={() => setMobileMenuOpen(false)}>
            <Button variant="ghost" className="w-full justify-start gap-3 h-10 relative">
              <BellIcon className="w-4 h-4" />
              {t.notifications}
              {unreadCounts["notifications"] > 0 && (
                <Badge className="mr-auto h-5 px-1.5 bg-destructive text-destructive-foreground">
                  {unreadCounts["notifications"] > 99 ? "99+" : unreadCounts["notifications"]}
                </Badge>
              )}
            </Button>
          </Link>

          <Link href="/chat/assistant" onClick={() => setMobileMenuOpen(false)}>
            <Button variant="ghost" className="w-full justify-start gap-3 h-10">
              <SparklesIcon className="w-4 h-4 text-amber-500" />
              {t.assistant}
            </Button>
          </Link>

          <Link href="/chat/profile" onClick={() => setMobileMenuOpen(false)}>
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
                setMobileMenuOpen(false)
              }}
            >
              <PlusIcon className="w-3 h-3" />
            </Button>
          </div>

          {cellsExpanded && (
            <>
              {groups.map((group) => (
                <Link key={group.id} href={`/chat/${group.id}`} onClick={() => setMobileMenuOpen(false)}>
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
          <Link href="/admin" onClick={() => setMobileMenuOpen(false)}>
            <Button variant="ghost" className="w-full justify-start gap-3 h-10 text-cyan-500">
              <XIcon className="w-4 h-4" />
              {t.admin}
            </Button>
          </Link>
        )}

        <Link href="/chat/settings" onClick={() => setMobileMenuOpen(false)}>
          <Button variant="ghost" className="w-full justify-start gap-3 h-10">
            <SettingsIcon className="w-4 h-4" />
            {t.settings}
          </Button>
        </Link>

        <Link href="/chat/about" onClick={() => setMobileMenuOpen(false)}>
          <Button variant="ghost" className="w-full justify-start gap-3 h-10">
            <HelpCircleIcon className="w-4 h-4" />
            {t.help}
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
    </nav>
  )
}

export function AppShell({ children, userId, profile, groups }: AppShellProps) {
  const [commandOpen, setCommandOpen] = useState(false)
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({})
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [cellsExpanded, setCellsExpanded] = useState(true)
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false)
  const [inviteLink, setInviteLink] = useState("")
  const [isJoining, setIsJoining] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const { theme, setTheme } = useTheme()
  const { language } = useSettings()
  const t = translations[language]
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const fetchUnreadData = async () => {
      const unreadResult = await supabase
        .from("group_unread_counts")
        .select("group_id, unread_count")
        .eq("user_id", userId)

      if (unreadResult.data) {
        const counts: Record<string, number> = {}
        unreadResult.data.forEach((item) => {
          counts[item.group_id] = item.unread_count
        })
        setUnreadCounts(counts)
      }
    }

    fetchUnreadData()

    // Real-time subscriptions
    const channel = supabase
      .channel("app-shell-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "group_unread_counts", filter: `user_id=eq.${userId}` },
        fetchUnreadData,
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, supabase])

  useEffect(() => {
    const checkAdmin = async () => {
      const { data } = await createClient().from("profiles").select("role").eq("id", userId).single()
      setIsAdmin(data?.role === "admin" || data?.role === "owner")
    }
    checkAdmin()
  }, [userId])

  return (
    <BottomNavProvider>
      <BottomNavController />
      <div className="relative h-dvh flex bg-background">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex w-64 flex-col bg-card border-l border-border">
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

                <Link href="/chat">
                  <Button
                    variant={pathname === "/chat" ? "secondary" : "ghost"}
                    className="w-full justify-start gap-3 h-10"
                  >
                    <HomeIcon className="w-4 h-4" />
                    {t.home}
                  </Button>
                </Link>

                <Link href="/chat/notifications">
                  <Button variant="ghost" className="w-full justify-start gap-3 h-10 relative">
                    <BellIcon className="w-4 h-4" />
                    {t.notifications}
                    {unreadCounts["notifications"] > 0 && (
                      <Badge className="ml-auto h-5 px-1.5 bg-destructive text-destructive-foreground">
                        {unreadCounts["notifications"] > 99 ? "99+" : unreadCounts["notifications"]}
                      </Badge>
                    )}
                  </Button>
                </Link>

                <Link href="/chat/assistant">
                  <Button variant="ghost" className="w-full justify-start gap-3 h-10">
                    <SparklesIcon className="w-4 h-4 text-amber-500" />
                    {t.assistant}
                  </Button>
                </Link>

                <Link href="/chat/profile">
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
                    }}
                  >
                    <PlusIcon className="w-3 h-3" />
                  </Button>
                </div>

                {cellsExpanded && (
                  <>
                    {groups.map((group) => (
                      <Link key={group.id} href={`/chat/${group.id}`}>
                        <Button
                          variant={pathname.includes(group.id) ? "secondary" : "ghost"}
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

                {/* Join by Invite */}
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
                <Link href="/admin">
                  <Button variant="ghost" className="w-full justify-start gap-3 h-10 text-cyan-500">
                    <XIcon className="w-4 h-4" />
                    {t.admin}
                  </Button>
                </Link>
              )}

              <Link href="/chat/settings">
                <Button variant="ghost" className="w-full justify-start gap-3 h-10">
                  <SettingsIcon className="w-4 h-4" />
                  {t.settings}
                </Button>
              </Link>

              <Link href="/chat/about">
                <Button variant="ghost" className="w-full justify-start gap-3 h-10">
                  <HelpCircleIcon className="w-4 h-4" />
                  {t.help}
                </Button>
              </Link>

              <Button
                variant="ghost"
                className="w-full justify-start gap-3 h-10 text-destructive hover:text-destructive"
                onClick={() => {
                  createClient().auth.signOut()
                  router.push("/")
                }}
              >
                <LogOutIcon className="w-4 h-4" />
                {t.signOut}
              </Button>
            </div>
          </div>
        </aside>

        {/* Mobile Bottom Navigation */}
        <BottomNavigationBar pathname={pathname} unreadCounts={unreadCounts} userId={userId} profile={profile} t={t} />

        {/* Main Content */}
        <main className="flex-1 overflow-hidden">{children}</main>
      </div>
    </BottomNavProvider>
  )
}
