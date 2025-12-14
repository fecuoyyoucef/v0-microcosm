"use client"

import { useState, useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import {
  Users,
  LogOut,
  Loader2,
  Settings,
  User,
  Bookmark,
  Moon,
  Sun,
  UserPlus,
  HelpCircle,
  Home,
  Info,
  Bell,
} from "lucide-react"
import type { Profile } from "@/lib/types"
import { useTheme } from "next-themes"
import { useSettings } from "@/components/settings-provider"
import { CellSurveyDialog } from "@/components/groups/cell-survey-dialog"

interface ChatSidebarProps {
  userId: string
  mobileOnly?: boolean
  isOpen?: boolean
  onOpenChange?: (open: boolean) => void
}

interface ExtendedProfile extends Profile {
  email?: string
}

const translations = {
  ar: {
    profile: "ملفي الشخصي",
    newGroup: "خلية جديدة",
    savedMessages: "الرسائل المحفوظة",
    settings: "الإعدادات",
    inviteFriends: "دعوة أصدقاء",
    help: "مساعدة",
    about: "حول التطبيق",
    signOut: "تسجيل الخروج",
    home: "الصفحة الرئيسية",
    notifications: "الإشعارات",
    comingSoon: "قريباً",
    createGroup: "إنشاء خلية جديدة",
    createGroupDesc: "أنشئ خلية جديدة وادعُ أصدقاءك للانضمام",
    groupName: "اسم الخلية",
    groupNamePlaceholder: "مثال: رحلة الصيف",
    description: "الوصف (اختياري)",
    descPlaceholder: "وصف قصير للخلية...",
    creating: "جاري الإنشاء...",
    create: "إنشاء الخلية",
    mustLogin: "يجب تسجيل الدخول لإنشاء خلية",
    errorCreating: "خطأ في إنشاء الخلية",
    errorMember: "خطأ في إضافة العضو",
    unexpectedError: "حدث خطأ غير متوقع",
    user: "مستخدم",
  },
  en: {
    profile: "My Profile",
    newGroup: "New Cell",
    savedMessages: "Saved Messages",
    settings: "Settings",
    inviteFriends: "Invite Friends",
    help: "Help",
    about: "About",
    signOut: "Sign Out",
    home: "Home",
    notifications: "Notifications",
    comingSoon: "Coming Soon",
    createGroup: "Create New Cell",
    createGroupDesc: "Create a new cell and invite your friends",
    groupName: "Cell Name",
    groupNamePlaceholder: "e.g., Summer Trip",
    description: "Description (optional)",
    descPlaceholder: "Short cell description...",
    creating: "Creating...",
    create: "Create Cell",
    mustLogin: "You must login to create a cell",
    errorCreating: "Error creating cell",
    errorMember: "Error adding member",
    unexpectedError: "An unexpected error occurred",
    user: "User",
  },
  fr: {
    profile: "Mon Profil",
    newGroup: "Nouvelle Cellule",
    savedMessages: "Messages Sauvegardés",
    settings: "Paramètres",
    inviteFriends: "Inviter des Amis",
    help: "Aide",
    about: "À propos",
    signOut: "Déconnexion",
    home: "Accueil",
    notifications: "Notifications",
    comingSoon: "Bientôt",
    createGroup: "Créer une Nouvelle Cellule",
    createGroupDesc: "Créez une cellule et invitez vos amis",
    groupName: "Nom de la Cellule",
    groupNamePlaceholder: "ex: Voyage d'été",
    description: "Description (optionnel)",
    descPlaceholder: "Courte description de la cellule...",
    creating: "Création...",
    create: "Créer la Cellule",
    mustLogin: "Vous devez vous connecter pour créer une cellule",
    errorCreating: "Erreur lors de la création de la cellule",
    errorMember: "Erreur lors de l'ajout du membre",
    unexpectedError: "Une erreur inattendue s'est produite",
    user: "Utilisateur",
  },
}

export function ChatSidebar({ userId, mobileOnly = false, isOpen, onOpenChange }: ChatSidebarProps) {
  const [profile, setProfile] = useState<ExtendedProfile | null>(null)
  const [userEmail, setUserEmail] = useState<string>("")
  const [isCreating, setIsCreating] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [newGroupName, setNewGroupName] = useState("")
  const [newGroupDescription, setNewGroupDescription] = useState("")
  const [showCellSurvey, setShowCellSurvey] = useState(false)
  const [newGroupId, setNewGroupId] = useState<string | null>(null)
  const [internalOpen, setInternalOpen] = useState(false)
  const isMobileMenuOpen = isOpen !== undefined ? isOpen : internalOpen
  const setIsMobileMenuOpen = onOpenChange || setInternalOpen
  const [error, setError] = useState<string | null>(null)
  const [unreadNotifications, setUnreadNotifications] = useState(0)
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
    fetchProfile()
    fetchUnreadNotifications()

    // Subscribe to notifications
    const channel = supabase
      .channel("sidebar-notifications")
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

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  useEffect(() => {
    if (!mobileOnly) return

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
        setIsMobileMenuOpen(true)
      }

      isSwiping.current = false
    }

    document.addEventListener("touchstart", handleTouchStart, { passive: true })
    document.addEventListener("touchmove", handleTouchMove, { passive: true })
    document.addEventListener("touchend", handleTouchEnd, { passive: true })

    return () => {
      document.removeEventListener("touchstart", handleTouchStart)
      document.removeEventListener("touchmove", handleTouchMove)
      document.removeEventListener("touchend", handleTouchEnd)
    }
  }, [mobileOnly, setIsMobileMenuOpen])

  const fetchProfile = async () => {
    const { data } = await supabase.from("profiles").select("*").eq("id", userId).single()

    if (data) {
      setProfile(data)
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user?.email) {
      setUserEmail(user.email)
    }
  }

  const fetchUnreadNotifications = async () => {
    const { count } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_read", false)

    setUnreadNotifications(count || 0)
  }

  const createGroup = async () => {
    if (!newGroupName.trim()) return

    setIsCreating(true)
    setError(null)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setError(t.mustLogin)
        return
      }

      const { data: group, error: groupError } = await supabase
        .from("groups")
        .insert({
          name: newGroupName.trim(),
          description: newGroupDescription.trim() || null,
          created_by: user.id,
        })
        .select()
        .single()

      if (groupError) {
        console.error("Error creating group:", groupError)
        setError(`${t.errorCreating}: ${groupError.message}`)
        return
      }

      const { error: memberError } = await supabase.from("group_members").insert({
        group_id: group.id,
        user_id: user.id,
        role: "admin",
      })

      if (memberError) {
        console.error("Error adding member:", memberError)
        await supabase.from("groups").delete().eq("id", group.id)
        setError(`${t.errorMember}: ${memberError.message}`)
        return
      }

      setNewGroupName("")
      setNewGroupDescription("")
      setIsDialogOpen(false)
      setNewGroupId(group.id)
      setShowCellSurvey(true)
    } catch (error: any) {
      console.error("Error creating group:", error)
      setError(error.message || t.unexpectedError)
    } finally {
      setIsCreating(false)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/")
    router.refresh()
  }

  const closeSidebar = () => {
    setIsMobileMenuOpen(false)
  }

  const handleSurveyComplete = () => {
    if (newGroupId) {
      setIsMobileMenuOpen(false)
      router.push(`/chat/${newGroupId}`)
      setNewGroupId(null)
    }
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-card">
      <div className="p-4 bg-primary/10">
        <div className="flex items-center justify-between mb-4">
          <Avatar className="h-16 w-16 border-2 border-primary/20">
            {profile?.avatar_url && <AvatarImage src={profile.avatar_url || "/placeholder.svg"} />}
            <AvatarFallback className="bg-primary text-primary-foreground text-xl font-bold">
              {profile?.display_name?.charAt(0) || <User className="w-6 h-6" />}
            </AvatarFallback>
          </Avatar>
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
        </div>
        <div>
          <p className="font-semibold text-lg">{profile?.display_name || t.user}</p>
          {profile?.username && <p className="text-sm text-muted-foreground">@{profile.username}</p>}
          <p className="text-xs text-muted-foreground mt-0.5">{userEmail}</p>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="py-2">
          <Link href="/chat" onClick={closeSidebar}>
            <div className="flex items-center gap-4 px-4 py-3 hover:bg-secondary transition-colors cursor-pointer">
              <Home className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm font-medium">{t.home}</span>
            </div>
          </Link>

          <Link href="/chat/notifications" onClick={closeSidebar}>
            <div className="flex items-center gap-4 px-4 py-3 hover:bg-secondary transition-colors cursor-pointer">
              <div className="relative">
                <Bell className="w-5 h-5 text-muted-foreground" />
                {unreadNotifications > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center">
                    {unreadNotifications > 9 ? "9+" : unreadNotifications}
                  </span>
                )}
              </div>
              <span className="text-sm font-medium">{t.notifications}</span>
              {unreadNotifications > 0 && (
                <span className="mr-auto px-2 py-0.5 rounded-full bg-destructive text-destructive-foreground text-xs">
                  {unreadNotifications}
                </span>
              )}
            </div>
          </Link>

          <Link href="/chat/settings/account" onClick={closeSidebar}>
            <div className="flex items-center gap-4 px-4 py-3 hover:bg-secondary transition-colors cursor-pointer">
              <User className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm font-medium">{t.profile}</span>
            </div>
          </Link>

          <Dialog
            open={isDialogOpen}
            onOpenChange={(open) => {
              setIsDialogOpen(open)
              setError(null)
            }}
          >
            <DialogTrigger asChild>
              <div className="flex items-center gap-4 px-4 py-3 hover:bg-secondary transition-colors cursor-pointer">
                <Users className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm font-medium">{t.newGroup}</span>
              </div>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{t.createGroup}</DialogTitle>
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

          <div className="flex items-center gap-4 px-4 py-3 hover:bg-secondary transition-colors cursor-pointer opacity-50">
            <Bookmark className="w-5 h-5 text-muted-foreground" />
            <span className="text-sm font-medium">{t.savedMessages}</span>
            <span className="text-xs text-muted-foreground mr-auto">{t.comingSoon}</span>
          </div>

          <Link href="/chat/settings/appearance" onClick={closeSidebar}>
            <div className="flex items-center gap-4 px-4 py-3 hover:bg-secondary transition-colors cursor-pointer">
              <Settings className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm font-medium">{t.settings}</span>
            </div>
          </Link>

          <Separator className="my-2" />

          <div className="flex items-center gap-4 px-4 py-3 hover:bg-secondary transition-colors cursor-pointer opacity-50">
            <UserPlus className="w-5 h-5 text-muted-foreground" />
            <span className="text-sm font-medium">{t.inviteFriends}</span>
            <span className="text-xs text-muted-foreground mr-auto">{t.comingSoon}</span>
          </div>

          <Link href="/chat/about" onClick={closeSidebar}>
            <div className="flex items-center gap-4 px-4 py-3 hover:bg-secondary transition-colors cursor-pointer">
              <Info className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm font-medium">{t.about}</span>
            </div>
          </Link>

          <div className="flex items-center gap-4 px-4 py-3 hover:bg-secondary transition-colors cursor-pointer opacity-50">
            <HelpCircle className="w-5 h-5 text-muted-foreground" />
            <span className="text-sm font-medium">{t.help}</span>
            <span className="text-xs text-muted-foreground mr-auto">{t.comingSoon}</span>
          </div>
        </div>
      </ScrollArea>

      <div className="p-3 border-t border-border">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={handleSignOut}
        >
          <LogOut className="w-5 h-5" />
          {t.signOut}
        </Button>
      </div>
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

  if (mobileOnly) {
    return (
      <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
        <SheetContent side="right" className="w-80 p-0">
          <SidebarContent />
        </SheetContent>
      </Sheet>
    )
  }

  return <SidebarContent />
}
