"use client"

import { useState, useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  Plus,
  Users,
  Settings,
  User,
  LogOut,
  Loader2,
  Search,
  Bookmark,
  Moon,
  Sun,
  UserPlus,
  HelpCircle,
  Bell,
  Info,
} from "lucide-react"
import type { Group, Profile } from "@/lib/types"
import { cn } from "@/lib/utils"
import { useTheme } from "next-themes"
import { useSettings } from "@/components/settings-provider"
import { SuggestedCells } from "@/components/groups/suggested-cells"
import { CellSurveyDialog } from "@/components/groups/cell-survey-dialog"

interface GroupsListPageProps {
  groups: Group[]
  userId: string
  profile: Profile | null
}

interface UnreadCount {
  group_id: string
  unread_count: number
}

const translations = {
  ar: {
    chats: "الخلايا",
    search: "بحث في الخلايا...",
    noResults: "لا توجد نتائج",
    noChats: "لا توجد خلايا",
    tryDifferent: "جرب البحث بكلمات مختلفة",
    createGroupHint: "أنشئ خلية جديدة لتبدأ المحادثة مع أصدقائك",
    createGroup: "إنشاء خلية",
    createGroupTitle: "إنشاء خلية جديدة",
    createGroupDesc: "أنشئ خلية جديدة وادعُ أصدقاءك للانضمام",
    groupName: "اسم الخلية",
    groupNamePlaceholder: "مثال: رحلة الصيف",
    description: "الوصف (اختياري)",
    descPlaceholder: "وصف قصير للخلية...",
    creating: "جاري الإنشاء...",
    create: "إنشاء الخلية",
    errorCreating: "خطأ في إنشاء الخلية",
    errorMember: "خطأ في إضافة العضو",
    unexpectedError: "حدث خطأ غير متوقع",
    profile: "ملفي الشخصي",
    newGroup: "خلية جديدة",
    savedMessages: "الرسائل المحفوظة",
    settings: "الإعدادات",
    inviteFriends: "دعوة أصدقاء",
    help: "مساعدة",
    about: "حول التطبيق",
    notifications: "الإشعارات",
    signOut: "تسجيل الخروج",
    home: "الصفحة الرئيسية",
    comingSoon: "قريباً",
    user: "مستخدم",
    members: "أعضاء",
  },
  en: {
    chats: "Cells",
    search: "Search cells...",
    noResults: "No results",
    noChats: "No cells",
    tryDifferent: "Try different keywords",
    createGroupHint: "Create a new cell to start chatting with friends",
    createGroup: "Create Cell",
    createGroupTitle: "Create New Cell",
    createGroupDesc: "Create a new cell and invite your friends",
    groupName: "Cell Name",
    groupNamePlaceholder: "e.g., Summer Trip",
    description: "Description (optional)",
    descPlaceholder: "Short cell description...",
    creating: "Creating...",
    create: "Create Cell",
    errorCreating: "Error creating cell",
    errorMember: "Error adding member",
    unexpectedError: "An unexpected error occurred",
    profile: "My Profile",
    newGroup: "New Cell",
    savedMessages: "Saved Messages",
    settings: "Settings",
    inviteFriends: "Invite Friends",
    help: "Help",
    about: "About",
    notifications: "Notifications",
    signOut: "Sign Out",
    home: "Home",
    comingSoon: "Coming Soon",
    user: "User",
    members: "members",
  },
  fr: {
    chats: "Cellules",
    search: "Rechercher...",
    noResults: "Aucun résultat",
    noChats: "Aucune cellule",
    tryDifferent: "Essayez d'autres mots",
    createGroupHint: "Créez une cellule pour discuter avec vos amis",
    createGroup: "Créer une cellule",
    createGroupTitle: "Créer une nouvelle cellule",
    createGroupDesc: "Créez une cellule et invitez vos amis",
    groupName: "Nom de la cellule",
    groupNamePlaceholder: "ex: Voyage d'été",
    description: "Description (optionnel)",
    descPlaceholder: "Courte description...",
    creating: "Création...",
    create: "Créer",
    errorCreating: "Erreur de création",
    errorMember: "Erreur d'ajout de membre",
    unexpectedError: "Une erreur inattendue",
    profile: "Mon Profil",
    newGroup: "Nouvelle Cellule",
    savedMessages: "Messages Sauvegardés",
    settings: "Paramètres",
    inviteFriends: "Inviter des Amis",
    help: "Aide",
    about: "À propos",
    notifications: "Notifications",
    signOut: "Déconnexion",
    home: "Accueil",
    comingSoon: "Bientôt",
    user: "Utilisateur",
    members: "membres",
  },
}

export function GroupsListPage({ groups: initialGroups, userId, profile }: GroupsListPageProps) {
  const [groups, setGroups] = useState<Group[]>(initialGroups)
  const [searchQuery, setSearchQuery] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newGroupName, setNewGroupName] = useState("")
  const [newGroupDescription, setNewGroupDescription] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [unreadNotifications, setUnreadNotifications] = useState(0)
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({})
  const [showCellSurvey, setShowCellSurvey] = useState(false)
  const [newGroupId, setNewGroupId] = useState<string | null>(null)
  const [memberCounts, setMemberCounts] = useState<Record<string, number>>({})
  const router = useRouter()
  const supabase = createClient()
  const { theme, setTheme } = useTheme()
  const { language } = useSettings()
  const t = translations[language]

  const touchStartX = useRef<number>(0)
  const touchStartY = useRef<number>(0)
  const touchEndX = useRef<number>(0)
  const isSwiping = useRef<boolean>(false)

  useEffect(() => {
    fetchUnreadNotifications()
    fetchUnreadCounts()
    fetchMemberCounts()

    const channel = supabase
      .channel("home-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          setUnreadNotifications((prev) => prev + 1)
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const updated = payload.new as any
          if (updated.is_read) {
            setUnreadNotifications((prev) => Math.max(0, prev - 1))
          }
        },
      )
      .subscribe()

    const unreadChannel = supabase
      .channel("unread-counts")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "group_unread_counts",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
            const data = payload.new as UnreadCount
            setUnreadCounts((prev) => ({
              ...prev,
              [data.group_id]: data.unread_count,
            }))
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
      supabase.removeChannel(unreadChannel)
    }
  }, [userId])

  const fetchMemberCounts = async () => {
    const groupIds = initialGroups.map((g) => g.id)
    if (groupIds.length === 0) return

    const { data } = await supabase.from("group_members").select("group_id").in("group_id", groupIds)

    if (data) {
      const counts: Record<string, number> = {}
      data.forEach((item) => {
        counts[item.group_id] = (counts[item.group_id] || 0) + 1
      })
      setMemberCounts(counts)
    }
  }

  const handleTouchStart = (e: TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
    isSwiping.current = false
  }

  const handleTouchMove = (e: TouchEvent) => {
    touchEndX.current = e.touches[0].clientX
    const deltaX = touchStartX.current - touchEndX.current
    const deltaY = Math.abs(e.touches[0].clientY - touchStartY.current)

    if (deltaX > 30 && deltaY < 50) {
      isSwiping.current = true
    }
  }

  const handleTouchEnd = () => {
    if (!isSwiping.current) return

    const swipeDistance = touchStartX.current - touchEndX.current
    const startedFromRightHalf = touchStartX.current > window.innerWidth / 2

    if (swipeDistance > 80 && startedFromRightHalf) {
      setIsSidebarOpen(true)
    }

    isSwiping.current = false
  }

  useEffect(() => {
    document.addEventListener("touchstart", handleTouchStart, { passive: true })
    document.addEventListener("touchmove", handleTouchMove, { passive: true })
    document.addEventListener("touchend", handleTouchEnd, { passive: true })

    return () => {
      document.removeEventListener("touchstart", handleTouchStart)
      document.removeEventListener("touchmove", handleTouchMove)
      document.removeEventListener("touchend", handleTouchEnd)
    }
  }, [])

  const fetchUnreadNotifications = async () => {
    const { count } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_read", false)

    setUnreadNotifications(count || 0)
  }

  const fetchUnreadCounts = async () => {
    const { data } = await supabase.from("group_unread_counts").select("group_id, unread_count").eq("user_id", userId)

    if (data) {
      const counts: Record<string, number> = {}
      data.forEach((item) => {
        counts[item.group_id] = item.unread_count
      })
      setUnreadCounts(counts)
    }
  }

  const filteredGroups = searchQuery
    ? groups.filter(
        (g) =>
          g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          g.description?.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : groups

  const createGroup = async () => {
    if (!newGroupName.trim()) return

    setIsCreating(true)
    setError(null)

    try {
      const { data: group, error: groupError } = await supabase
        .from("groups")
        .insert({
          name: newGroupName.trim(),
          description: newGroupDescription.trim() || null,
          created_by: userId,
        })
        .select()
        .single()

      if (groupError) {
        setError(`${t.errorCreating}: ${groupError.message}`)
        setIsCreating(false)
        return
      }

      const { error: memberError } = await supabase.from("group_members").insert({
        group_id: group.id,
        user_id: userId,
        role: "admin",
      })

      if (memberError) {
        await supabase.from("groups").delete().eq("id", group.id)
        setError(`${t.errorMember}: ${memberError.message}`)
        setIsCreating(false)
        return
      }

      setNewGroupName("")
      setNewGroupDescription("")
      setIsCreateDialogOpen(false)
      setIsSidebarOpen(false)
      setGroups((prev) => [...prev, group])
      setNewGroupId(group.id)
      setShowCellSurvey(true)
    } catch {
      setError(t.unexpectedError)
    } finally {
      setIsCreating(false)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/")
  }

  const getGroupColor = (name: string) => {
    const colors = ["bg-blue-500", "bg-emerald-500", "bg-violet-500", "bg-amber-500", "bg-rose-500", "bg-cyan-500"]
    return colors[name.charCodeAt(0) % colors.length]
  }

  const totalUnread = Object.values(unreadCounts).reduce((sum, count) => sum + count, 0) + unreadNotifications

  useEffect(() => {
    if ("setAppBadge" in navigator && totalUnread > 0) {
      ;(navigator as any).setAppBadge(totalUnread)
    } else if ("clearAppBadge" in navigator && totalUnread === 0) {
      ;(navigator as any).clearAppBadge()
    }
  }, [totalUnread])

  const handleOpenCreateDialog = () => {
    setIsSidebarOpen(false)
    setTimeout(() => {
      setIsCreateDialogOpen(true)
    }, 150)
  }

  const handleSurveyComplete = () => {
    if (newGroupId) {
      router.push(`/chat/${newGroupId}`)
      setNewGroupId(null)
    }
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full hover:bg-primary/10"
              onClick={() => setIsSidebarOpen(true)}
            >
              <div className="w-8 h-8 relative">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={profile?.avatar_url || undefined} className="object-cover" />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {profile?.full_name?.charAt(0) || <User className="w-4 h-4" />}
                  </AvatarFallback>
                </Avatar>
              </div>
            </Button>
            <h1 className="text-lg font-semibold">{t.chats}</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/chat/notifications">
              <Button variant="ghost" size="icon" className="rounded-full hover:bg-primary/10 relative">
                <Bell className="w-5 h-5" />
                {unreadNotifications > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center">
                    {unreadNotifications > 9 ? "9+" : unreadNotifications}
                  </span>
                )}
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={handleOpenCreateDialog}
            >
              <Plus className="w-5 h-5" />
            </Button>
          </div>
        </div>
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.search}
              className="pr-10 bg-secondary/50 border-0 rounded-xl h-10"
            />
          </div>
        </div>
      </header>

      <ScrollArea className="flex-1">
        <SuggestedCells userId={userId} />
        {filteredGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <div className="w-20 h-20 rounded-2xl bg-secondary flex items-center justify-center mb-4">
              <Users className="w-10 h-10 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-semibold mb-2">{searchQuery ? t.noResults : t.noChats}</h2>
            <p className="text-sm text-muted-foreground mb-6 max-w-xs">
              {searchQuery ? t.tryDifferent : t.createGroupHint}
            </p>
            {!searchQuery && (
              <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2 rounded-xl">
                <Plus className="w-4 h-4" />
                {t.createGroup}
              </Button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredGroups.map((group) => (
              <Link key={group.id} href={`/chat/${group.id}`}>
                <div className="flex items-center gap-3 p-4 hover:bg-secondary/50 transition-colors">
                  <Avatar className={cn("h-12 w-12", getGroupColor(group.name))}>
                    {group.avatar_url ? (
                      <AvatarImage src={group.avatar_url || "/placeholder.svg"} className="object-cover" />
                    ) : (
                      <AvatarFallback className="bg-transparent text-white font-bold">
                        {group.name.substring(0, 2)}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold truncate">{group.name}</h3>
                      {unreadCounts[group.id] > 0 && (
                        <span className="h-5 min-w-5 px-1.5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center font-medium">
                          {unreadCounts[group.id] > 99 ? "99+" : unreadCounts[group.id]}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {group.description || `${memberCounts[group.id] || 1} ${t.members}`}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </ScrollArea>

      <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
        <SheetContent side="right" className="w-80 p-0">
          <div className="flex flex-col h-full">
            <div className="p-6 bg-gradient-to-br from-primary/20 to-primary/5">
              <div className="flex items-center gap-4">
                <Avatar className="w-16 h-16 border-2 border-background shadow-lg">
                  <AvatarImage src={profile?.avatar_url || undefined} className="object-cover" />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                    {profile?.full_name?.charAt(0) || <User className="w-8 h-8" />}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h2 className="font-semibold text-lg truncate">{profile?.full_name || t.user}</h2>
                  {profile?.username && <p className="text-sm text-muted-foreground truncate">@{profile.username}</p>}
                </div>
              </div>
            </div>

            <ScrollArea className="flex-1">
              <div className="py-2">
                <Link href="/chat/settings/account" onClick={() => setIsSidebarOpen(false)}>
                  <div className="flex items-center gap-4 px-4 py-3 hover:bg-secondary transition-colors cursor-pointer">
                    <User className="w-5 h-5 text-muted-foreground" />
                    <span className="text-sm font-medium">{t.profile}</span>
                  </div>
                </Link>

                <div
                  className="flex items-center gap-4 px-4 py-3 hover:bg-secondary transition-colors cursor-pointer"
                  onClick={handleOpenCreateDialog}
                >
                  <Users className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm font-medium">{t.newGroup}</span>
                </div>

                <div className="flex items-center gap-4 px-4 py-3 hover:bg-secondary transition-colors cursor-pointer opacity-50">
                  <Bookmark className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm font-medium">{t.savedMessages}</span>
                  <span className="text-xs text-muted-foreground mr-auto">{t.comingSoon}</span>
                </div>

                <Link href="/chat/notifications" onClick={() => setIsSidebarOpen(false)}>
                  <div className="flex items-center gap-4 px-4 py-3 hover:bg-secondary transition-colors cursor-pointer relative">
                    <Bell className="w-5 h-5 text-muted-foreground" />
                    <span className="text-sm font-medium">{t.notifications}</span>
                    {unreadNotifications > 0 && (
                      <span className="absolute left-8 top-2 w-2 h-2 bg-destructive rounded-full" />
                    )}
                  </div>
                </Link>

                <Separator className="my-2" />

                <Link href="/chat/settings" onClick={() => setIsSidebarOpen(false)}>
                  <div className="flex items-center gap-4 px-4 py-3 hover:bg-secondary transition-colors cursor-pointer">
                    <Settings className="w-5 h-5 text-muted-foreground" />
                    <span className="text-sm font-medium">{t.settings}</span>
                  </div>
                </Link>

                <div
                  className="flex items-center gap-4 px-4 py-3 hover:bg-secondary transition-colors cursor-pointer"
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                >
                  {theme === "dark" ? (
                    <Sun className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <Moon className="w-5 h-5 text-muted-foreground" />
                  )}
                  <span className="text-sm font-medium">{theme === "dark" ? "الوضع الفاتح" : "الوضع الداكن"}</span>
                </div>

                <Separator className="my-2" />

                <Link href="/chat/about" onClick={() => setIsSidebarOpen(false)}>
                  <div className="flex items-center gap-4 px-4 py-3 hover:bg-secondary transition-colors cursor-pointer">
                    <Info className="w-5 h-5 text-muted-foreground" />
                    <span className="text-sm font-medium">{t.about}</span>
                  </div>
                </Link>

                <div className="flex items-center gap-4 px-4 py-3 hover:bg-secondary transition-colors cursor-pointer opacity-50">
                  <UserPlus className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm font-medium">{t.inviteFriends}</span>
                  <span className="text-xs text-muted-foreground mr-auto">{t.comingSoon}</span>
                </div>

                <div className="flex items-center gap-4 px-4 py-3 hover:bg-secondary transition-colors cursor-pointer opacity-50">
                  <HelpCircle className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm font-medium">{t.help}</span>
                  <span className="text-xs text-muted-foreground mr-auto">{t.comingSoon}</span>
                </div>
              </div>
            </ScrollArea>

            <div className="p-4 border-t">
              <Button
                variant="ghost"
                className="w-full justify-start gap-4 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={handleSignOut}
              >
                <LogOut className="w-5 h-5" />
                {t.signOut}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog
        open={isCreateDialogOpen}
        onOpenChange={(open) => {
          setIsCreateDialogOpen(open)
          if (!open) {
            setError(null)
            setNewGroupName("")
            setNewGroupDescription("")
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t.createGroupTitle}</DialogTitle>
            <DialogDescription>{t.createGroupDesc}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {error && <div className="p-3 rounded-xl bg-destructive/10 text-destructive text-sm">{error}</div>}
            <div className="space-y-2">
              <Label htmlFor="groupName">{t.groupName}</Label>
              <Input
                id="groupName"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder={t.groupNamePlaceholder}
                className="bg-background rounded-xl"
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="groupDescription">{t.description}</Label>
              <Textarea
                id="groupDescription"
                value={newGroupDescription}
                onChange={(e) => setNewGroupDescription(e.target.value)}
                placeholder={t.descPlaceholder}
                className="bg-background resize-none rounded-xl"
                rows={3}
              />
            </div>
            <Button
              onClick={createGroup}
              disabled={!newGroupName.trim() || isCreating}
              className="w-full rounded-xl h-11"
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin ml-2" />
                  {t.creating}
                </>
              ) : (
                t.create
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {newGroupId && (
        <CellSurveyDialog
          open={showCellSurvey}
          onOpenChange={setShowCellSurvey}
          groupId={newGroupId}
          onComplete={handleSurveyComplete}
        />
      )}
    </div>
  )
}
