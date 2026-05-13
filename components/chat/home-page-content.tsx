"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { SmartRecommendations } from "@/components/groups/smart-recommendations"
import { SuggestedCells } from "@/components/groups/suggested-cells"
import { CellSurveyDialog } from "@/components/groups/cell-survey-dialog"
import { MarkdownRenderer } from "@/components/ui/markdown-renderer"
import {
  PlusIcon,
  UsersIcon,
  MagnifyingGlassIcon as Search,
  ArrowPathIcon as Loader2,
  ChatBubbleLeftIcon as MessageCircle,
  LinkIcon as Link2,
  ClockIcon,
  StarIcon,
  AdjustmentsHorizontalIcon,
  ChevronUpIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline"
import type { Group, Profile } from "@/lib/types"
import { cn } from "@/lib/utils"
import { useSettings } from "@/components/settings-provider"

interface HomePageContentProps {
  groups: Group[]
  userId: string
  profile: Profile | null
  hasCompletedSurvey?: boolean
}

const translations = {
  ar: {
    welcome: "مرحباً",
    cells: "الخلايا",
    search: "بحث في الخلايا...",
    noResults: "لا توجد نتائج",
    noCells: "لا توجد خلايا بعد",
    createFirst: "أنشئ أول خلية لك وابدأ بالتواصل مع أصدقائك",
    createCell: "إنشاء خلية",
    createCellTitle: "خلية جديدة",
    createCellDesc: "أنشئ مساحة جديدة للتواصل مع فريقك",
    cellName: "اسم الخلية",
    cellNamePlaceholder: "مثال: فريق العمل",
    description: "الوصف (اختياري)",
    descPlaceholder: "وصف مختصر للخلية...",
    creating: "جاري الإنشاء...",
    create: "إنشاء",
    members: "أعضاء",
    recentActivity: "النشاط الأخير",
    quickActions: "إجراءات سريعة",
    newCell: "خلية جديدة",
    assistant: "المساعد الذكي",
    exploreAI: "استكشف الذكاء الاصطناعي",
    supportAgent: "دعم العملاء",
    supportDesc: "تحدث مع وكيل الدعم الذكي",
    sendMessage: "إرسال",
    typeMessage: "اكتب رسالتك...",
    supportTitle: "دعم العملاء",
    joinByInvite: "انضم بدعوة",
    inviteLinkPlaceholder: "الصق رابط الدعوة هنا...",
    join: "انضم",
    joining: "جاري الانضمام...",
    invalidInviteLink: "رابط الدعوة غير صالح",
    sortNewest: "الأحدث",
    sortImportant: "الأهم",
    sortCustom: "تخصيص",
    moveUp: "تحريك للأعلى",
    moveDown: "تحريك للأسفل",
    sortBy: "ترتيب حسب",
  },
  en: {
    welcome: "Welcome",
    cells: "Cells",
    search: "Search cells...",
    noResults: "No results",
    noCells: "No cells yet",
    createFirst: "Create your first cell and start connecting with friends",
    createCell: "Create Cell",
    createCellTitle: "New Cell",
    createCellDesc: "Create a new space to connect with your team",
    cellName: "Cell Name",
    cellNamePlaceholder: "e.g., Work Team",
    description: "Description (optional)",
    descPlaceholder: "Brief description...",
    creating: "Creating...",
    create: "Create",
    members: "members",
    recentActivity: "Recent Activity",
    quickActions: "Quick Actions",
    newCell: "New Cell",
    assistant: "AI Assistant",
    exploreAI: "Explore AI Features",
    supportAgent: "Customer Support",
    supportDesc: "Chat with AI support agent",
    sendMessage: "Send",
    typeMessage: "Type your message...",
    supportTitle: "Customer Support",
    joinByInvite: "Join by Invite",
    inviteLinkPlaceholder: "Paste invite link here...",
    join: "Join",
    joining: "Joining...",
    invalidInviteLink: "Invalid invite link",
    sortNewest: "Newest",
    sortImportant: "Important",
    sortCustom: "Custom",
    moveUp: "Move up",
    moveDown: "Move down",
    sortBy: "Sort by",
  },
  fr: {
    welcome: "Bienvenue",
    cells: "Cellules",
    search: "Rechercher...",
    noResults: "Aucun résultat",
    noCells: "Pas de cellules",
    createFirst: "Créez votre première cellule",
    createCell: "Créer une cellule",
    createCellTitle: "Nouvelle Cellule",
    createCellDesc: "Créez un nouvel espace",
    cellName: "Nom",
    cellNamePlaceholder: "ex: Équipe",
    description: "Description",
    descPlaceholder: "Description...",
    creating: "Création...",
    create: "Créer",
    members: "membres",
    recentActivity: "Activité récente",
    quickActions: "Actions rapides",
    newCell: "Nouvelle Cellule",
    assistant: "Assistant IA",
    exploreAI: "Explorer l'IA",
    supportAgent: "Support Client",
    supportDesc: "Discuter avec l'agent",
    sendMessage: "Envoyer",
    typeMessage: "Votre message...",
    supportTitle: "Support Client",
    joinByInvite: "Rejoindre par invitation",
    inviteLinkPlaceholder: "Collez le lien...",
    join: "Rejoindre",
    joining: "En cours...",
    invalidInviteLink: "Lien invalide",
    sortNewest: "Récent",
    sortImportant: "Important",
    sortCustom: "Personnalisé",
    moveUp: "Monter",
    moveDown: "Descendre",
    sortBy: "Trier par",
  },
}

const removeThinkingTags = (text: string) => {
  return text
    .replace(/<[Tt][Hh][Ii][Nn][Kk](?:[Ii][Nn][Gg])?>([\s\S]*?)<\/[Tt][Hh][Ii][Nn][Kk](?:[Ii][Nn][Gg])?>/gi, "")
    .replace(/<Thinking>([\s\S]*?)<\/thinking>/gi, "")
    .trim()
}

export function HomePageContent({ groups: initialGroups, userId, profile, hasCompletedSurvey }: HomePageContentProps) {
  const [groups, setGroups] = useState<Group[]>(initialGroups)
  const [searchQuery, setSearchQuery] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newGroupName, setNewGroupName] = useState("")
  const [newGroupDescription, setNewGroupDescription] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [showCellSurvey, setShowCellSurvey] = useState(false)
  const [newGroupId, setNewGroupId] = useState<string | null>(null)
  const [memberCounts, setMemberCounts] = useState<Record<string, number>>({})
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({})
  const [showSupportDialog, setShowSupportDialog] = useState(false)
  const [supportMessages, setSupportMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([])
  const [supportInput, setSupportInput] = useState("")
  const [isSendingSupport, setIsSendingSupport] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false)
  const [inviteLink, setInviteLink] = useState("")
  const [isJoining, setIsJoining] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // ----- Sort state -----
  // 'newest'    -> by groups.updated_at desc (recent activity)
  // 'important' -> by unread count desc, then updated_at desc
  // 'custom'    -> user-defined order, persisted in localStorage and reorderable
  type SortMode = "newest" | "important" | "custom"
  const sortStorageKey = `cells:sort-mode:${userId}`
  const orderStorageKey = `cells:custom-order:${userId}`
  const [sortMode, setSortMode] = useState<SortMode>("newest")
  const [customOrder, setCustomOrder] = useState<string[]>([])

  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      const savedMode = window.localStorage.getItem(sortStorageKey) as SortMode | null
      if (savedMode === "newest" || savedMode === "important" || savedMode === "custom") {
        setSortMode(savedMode)
      }
      const savedOrder = window.localStorage.getItem(orderStorageKey)
      if (savedOrder) {
        const parsed = JSON.parse(savedOrder)
        if (Array.isArray(parsed)) setCustomOrder(parsed)
      }
    } catch {
      // ignore corrupted localStorage
    }
  }, [sortStorageKey, orderStorageKey])

  const updateSortMode = (mode: SortMode) => {
    setSortMode(mode)
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(sortStorageKey, mode)
      } catch {}
    }
  }

  const persistCustomOrder = (order: string[]) => {
    setCustomOrder(order)
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(orderStorageKey, JSON.stringify(order))
      } catch {}
    }
  }

  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const { language } = useSettings()
  const t = translations[language]

  useEffect(() => {
    console.log("[v0] HomePageContent mounted with initialGroups:", initialGroups?.length || 0)
    console.log("[v0] Profile loaded:", profile?.display_name)
    setIsLoading(false)
    
    // Initialize component
    fetchMemberCounts()
    fetchUnreadCounts()
  }, [])

  useEffect(() => {
    if (searchParams.get("new") === "true") {
      setIsCreateDialogOpen(true)
      router.replace("/chat")
    }
  }, [searchParams, router])

  useEffect(() => {
    fetchMemberCounts()
    fetchUnreadCounts()

    const channel = supabase
      .channel("home-updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "group_unread_counts", filter: `user_id=eq.${userId}` },
        () => fetchUnreadCounts(),
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
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

  // Apply text search filter, then apply the active sort mode.
  const filteredGroups = (() => {
    const base = searchQuery
      ? groups.filter(
          (g) =>
            g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            g.description?.toLowerCase().includes(searchQuery.toLowerCase()),
        )
      : groups.slice()

    if (sortMode === "newest") {
      return base.sort((a, b) => {
        const ta = new Date(a.updated_at || a.created_at).getTime()
        const tb = new Date(b.updated_at || b.created_at).getTime()
        return tb - ta
      })
    }

    if (sortMode === "important") {
      return base.sort((a, b) => {
        const ua = unreadCounts[a.id] || 0
        const ub = unreadCounts[b.id] || 0
        if (ub !== ua) return ub - ua
        const ta = new Date(a.updated_at || a.created_at).getTime()
        const tb = new Date(b.updated_at || b.created_at).getTime()
        return tb - ta
      })
    }

    // custom: use saved order; unknown ids fall back to the end in updated_at order.
    const orderIndex = new Map(customOrder.map((id, i) => [id, i]))
    return base.sort((a, b) => {
      const ia = orderIndex.has(a.id) ? (orderIndex.get(a.id) as number) : Number.MAX_SAFE_INTEGER
      const ib = orderIndex.has(b.id) ? (orderIndex.get(b.id) as number) : Number.MAX_SAFE_INTEGER
      if (ia !== ib) return ia - ib
      const ta = new Date(a.updated_at || a.created_at).getTime()
      const tb = new Date(b.updated_at || b.created_at).getTime()
      return tb - ta
    })
  })()

  // Reorder a single group up/down in custom mode.
  const moveGroup = (groupId: string, direction: -1 | 1) => {
    const currentIds = filteredGroups.map((g) => g.id)
    const idx = currentIds.indexOf(groupId)
    if (idx === -1) return
    const target = idx + direction
    if (target < 0 || target >= currentIds.length) return
    const next = currentIds.slice()
    ;[next[idx], next[target]] = [next[target], next[idx]]
    persistCustomOrder(next)
  }

  const createGroup = async () => {
    if (!newGroupName.trim()) return

    setIsCreating(true)
    setError(null)

    try {
      const requestBody = {
        name: newGroupName.trim(),
        description: newGroupDescription.trim() || null,
      }

      const response = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Failed to create cell")
        return
      }

      setNewGroupName("")
      setNewGroupDescription("")
      setIsCreateDialogOpen(false)
      setGroups((prev) => [...prev, data])
      setNewGroupId(data.id)
      setShowCellSurvey(true)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsCreating(false)
    }
  }

  const getGroupColor = (name: string) => {
    // Cohesive palette aligned with brand system (teal/saffron/sage)
    const colors = [
      "from-[oklch(0.55_0.13_195)] to-[oklch(0.62_0.15_165)]", // synaptic teal
      "from-[oklch(0.78_0.16_70)] to-[oklch(0.68_0.18_35)]",   // saffron warm
      "from-[oklch(0.62_0.15_165)] to-[oklch(0.55_0.13_195)]", // sage to teal
      "from-[oklch(0.5_0.12_240)] to-[oklch(0.55_0.13_195)]",  // indigo to teal
      "from-[oklch(0.68_0.18_35)] to-[oklch(0.78_0.16_70)]",   // warm orange
      "from-[oklch(0.55_0.13_195)] to-[oklch(0.5_0.12_240)]",  // teal indigo
    ]
    return colors[name.charCodeAt(0) % colors.length]
  }

  const handleSurveyComplete = () => {
    if (newGroupId) {
      router.push(`/chat/${newGroupId}`)
      setNewGroupId(null)
    }
  }

  const sendSupportMessage = async () => {
    if (!supportInput.trim() || isSendingSupport) return

    const userMessage = supportInput.trim()
    setSupportInput("")
    setSupportMessages((prev) => [...prev, { role: "user", content: userMessage }])
    setIsSendingSupport(true)

    try {
      const response = await fetch("/api/support/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          conversationId,
          history: supportMessages,
        }),
      })

      const data = await response.json()

      if (data.response) {
        const cleanedResponse = removeThinkingTags(data.response)
        setSupportMessages((prev) => [...prev, { role: "assistant", content: cleanedResponse }])
        if (data.conversationId) {
          setConversationId(data.conversationId)
        }
      } else if (data.error) {
        setSupportMessages((prev) => [...prev, { role: "assistant", content: "عذراً، حدث خطأ. حاول مرة أخرى." }])
      }
    } catch (error) {
      console.error("Support chat error:", error)
      setSupportMessages((prev) => [...prev, { role: "assistant", content: "عذراً، حدث خطأ. حاول مرة أخرى." }])
    } finally {
      setIsSendingSupport(false)
    }
  }

  const handleJoinByInvite = async () => {
    if (!inviteLink.trim()) return

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
    } catch (err) {
      console.error("Error joining by invite:", err)
      setInviteError(t.invalidInviteLink)
    } finally {
      setIsJoining(false)
    }
  }

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-background pb-16 md:pb-0">
      {/* Header with refined styling */}
      <header className="sticky top-0 z-10 glass border-b border-border/40 py-4 shrink-0">
        <div className="max-w-full px-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-heading font-bold truncate">
                {t.welcome}، {profile?.display_name?.split(" ")[0] || ""}
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">{t.cells}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Dialog
                open={isInviteDialogOpen}
                onOpenChange={(open) => {
                  setIsInviteDialogOpen(open)
                  setInviteError(null)
                  setInviteLink("")
                }}
              >
                <DialogTrigger asChild>
                  <Button variant="outline" size="icon" className="rounded-full h-10 w-10">
                    <Link2 className="w-5 h-5" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>{t.joinByInvite}</DialogTitle>
                    <DialogDescription>
                      {language === "ar" ? "الصق رابط الدعوة للانضمام إلى خلية" : "Paste invite link to join a cell"}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    {inviteError && (
                      <div className="p-3 rounded-xl bg-destructive/10 text-destructive text-sm">{inviteError}</div>
                    )}
                    <div className="space-y-2">
                      <Label htmlFor="inviteLinkHome">{language === "ar" ? "رابط الدعوة" : "Invite Link"}</Label>
                      <Input
                        id="inviteLinkHome"
                        value={inviteLink}
                        onChange={(e) => setInviteLink(e.target.value)}
                        placeholder={t.inviteLinkPlaceholder}
                        className="bg-background rounded-xl"
                        dir="ltr"
                      />
                    </div>
                    <Button
                      onClick={handleJoinByInvite}
                      disabled={!inviteLink.trim() || isJoining}
                      className="w-full rounded-xl h-11"
                    >
                      {isJoining ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin ml-2" />
                          {t.joining}
                        </>
                      ) : (
                        t.join
                      )}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              <Button onClick={() => setIsCreateDialogOpen(true)} size="icon" className="rounded-full h-10 w-10 shadow-synaptic-glow">
                <PlusIcon className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Search with refined input */}
          <div className="relative w-full">
            <Search className="absolute end-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.search}
              className="pe-10 bg-muted/40 border-border/50 rounded-xl h-11 w-full"
            />
          </div>

          {/* Sort toolbar: 3 segmented chips. Persisted per-user. */}
          <div
            role="tablist"
            aria-label={t.sortBy}
            className="flex items-center gap-1.5 p-1 bg-muted/40 rounded-xl border border-border/50"
          >
            <button
              role="tab"
              aria-selected={sortMode === "newest"}
              onClick={() => updateSortMode("newest")}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg text-xs font-medium transition-all",
                sortMode === "newest"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <ClockIcon className="w-4 h-4" />
              {t.sortNewest}
            </button>
            <button
              role="tab"
              aria-selected={sortMode === "important"}
              onClick={() => updateSortMode("important")}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg text-xs font-medium transition-all",
                sortMode === "important"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <StarIcon className="w-4 h-4" />
              {t.sortImportant}
            </button>
            <button
              role="tab"
              aria-selected={sortMode === "custom"}
              onClick={() => updateSortMode("custom")}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg text-xs font-medium transition-all",
                sortMode === "custom"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <AdjustmentsHorizontalIcon className="w-4 h-4" />
              {t.sortCustom}
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
        <div className="max-w-full px-4 py-6 space-y-6">
          {/* Quick Actions Grid */}
          <div className="grid grid-cols-2 gap-3 w-full">
            <Card
              className="cursor-pointer hover:border-primary/40 hover:shadow-synaptic transition-all overflow-hidden border-border/50"
              onClick={() => setIsCreateDialogOpen(true)}
            >
              <CardContent className="p-4 flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <PlusIcon className="w-5 h-5 text-primary" />
                </div>
                <span className="font-medium text-balance text-sm">{t.newCell}</span>
              </CardContent>
            </Card>

            <Card
              className="cursor-pointer hover:border-accent/40 hover:shadow-synaptic transition-all overflow-hidden border-border/50"
              onClick={() => setShowSupportDialog(true)}
            >
              <CardContent className="p-4 flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center shrink-0">
                  <MessageCircle className="w-5 h-5 text-accent-foreground" />
                </div>
                <span className="font-medium text-balance text-sm">{t.supportAgent}</span>
              </CardContent>
            </Card>
          </div>

          {/* Suggested Cells */}
          <div className="w-full">
            <SuggestedCells userId={userId} />
          </div>

          {/* Cells List */}
          <div className="w-full">
            {filteredGroups.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center mb-4">
                  <UsersIcon className="w-10 h-10 text-muted-foreground" />
                </div>
                <h2 className="text-lg font-semibold mb-2">{searchQuery ? t.noResults : t.noCells}</h2>
                <p className="text-sm text-muted-foreground mb-6 max-w-xs">{!searchQuery && t.createFirst}</p>
                {!searchQuery && (
                  <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2 rounded-xl">
                    <PlusIcon className="w-4 h-4" />
                    {t.createCell}
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3 w-full">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
                  {t.cells}
                </h3>
                <div className="space-y-1.5 w-full">
                  {filteredGroups.map((group, index) => {
                    const hasUnread = unreadCounts[group.id] > 0
                    const isFirst = index === 0
                    const isLast = index === filteredGroups.length - 1
                    // Only allow reordering on the unfiltered full list.
                    const inCustomMode = sortMode === "custom" && !searchQuery

                    const rowContent = (
                      <div
                        className={cn(
                          "group flex items-center gap-3 p-3 rounded-2xl transition-all min-w-0",
                          "hover:bg-muted/60 active:scale-[0.99]",
                          hasUnread && "bg-primary/[0.04]",
                        )}
                      >
                        <Avatar className="h-12 w-12 rounded-2xl shrink-0 ring-2 ring-background shadow-sm">
                          {group.avatar_url ? (
                            <AvatarImage src={group.avatar_url || "/placeholder.svg"} />
                          ) : (
                            <AvatarFallback
                              className={cn(
                                "rounded-2xl bg-gradient-to-br text-white font-bold text-base",
                                getGroupColor(group.name),
                              )}
                            >
                              {group.name.substring(0, 2)}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-0.5 min-w-0">
                            <h3
                              className={cn(
                                "truncate text-[15px]",
                                hasUnread ? "font-bold text-foreground" : "font-semibold text-foreground/90",
                              )}
                            >
                              {group.name}
                            </h3>
                            {hasUnread && (
                              <span className="h-5 min-w-5 px-1.5 rounded-full bg-primary text-primary-foreground text-[11px] flex items-center justify-center font-bold shrink-0 tabular-nums">
                                {unreadCounts[group.id] > 99 ? "99+" : unreadCounts[group.id]}
                              </span>
                            )}
                          </div>
                          {group.description && (
                            <p className="text-sm text-muted-foreground truncate">{group.description}</p>
                          )}
                          {!group.description && (
                            <p className="text-xs text-muted-foreground/75">
                              {memberCounts[group.id] || 1} {t.members}
                            </p>
                          )}
                        </div>
                        {inCustomMode && (
                          <div
                            className="flex flex-col gap-0.5 shrink-0"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                            }}
                          >
                            <button
                              type="button"
                              aria-label={t.moveUp}
                              disabled={isFirst}
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                moveGroup(group.id, -1)
                              }}
                              className={cn(
                                "h-8 w-8 rounded-md flex items-center justify-center transition-colors",
                                isFirst
                                  ? "text-muted-foreground/30 cursor-not-allowed"
                                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
                              )}
                            >
                              <ChevronUpIcon className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              aria-label={t.moveDown}
                              disabled={isLast}
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                moveGroup(group.id, 1)
                              }}
                              className={cn(
                                "h-8 w-8 rounded-md flex items-center justify-center transition-colors",
                                isLast
                                  ? "text-muted-foreground/30 cursor-not-allowed"
                                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
                              )}
                            >
                              <ChevronDownIcon className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    )

                    return (
                      <Link key={group.id} href={`/chat/${group.id}`} className="block w-full">
                        {rowContent}
                      </Link>
                    )
                  })}
                </div>
                            <p
                              className={cn(
                                "text-sm truncate",
                                hasUnread ? "text-foreground/70" : "text-muted-foreground",
                              )}
                            >
                              {group.description || `${memberCounts[group.id] || 1} ${t.members}`}
                            </p>
                          </div>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
          {/* Smart Recommendations */}
          {hasCompletedSurvey && (
            <div className="w-full">
              <SmartRecommendations userId={userId} />
            </div>
          )}
        </div>
      </div>

      {/* Create Cell Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t.createCellTitle}</DialogTitle>
            <DialogDescription>{t.createCellDesc}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {error && <div className="p-3 rounded-xl bg-destructive/10 text-destructive text-sm">{error}</div>}
            <div className="space-y-2">
              <Label htmlFor="cellName">{t.cellName}</Label>
              <Input
                id="cellName"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder={t.cellNamePlaceholder}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cellDescription">{t.description}</Label>
              <Textarea
                id="cellDescription"
                value={newGroupDescription}
                onChange={(e) => setNewGroupDescription(e.target.value)}
                placeholder={t.descPlaceholder}
                className="rounded-xl resize-none"
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

      {/* Support Dialog */}
      <Dialog open={showSupportDialog} onOpenChange={setShowSupportDialog}>
        <DialogContent className="sm:max-w-md max-h-[80vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
            <DialogTitle>{t.supportTitle}</DialogTitle>
            <DialogDescription>{t.supportDesc}</DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-y-auto px-6">
            <div className="space-y-4 pb-4">
              {supportMessages.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">{t.supportDesc}</p>
                </div>
              ) : (
                supportMessages.map((msg, idx) => (
                  <div key={idx} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
                    <div
                      className={cn(
                        "p-3 rounded-xl max-w-[280px] break-words",
                        msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted",
                      )}
                      style={{ overflowWrap: "anywhere", wordBreak: "break-word" }}
                    >
                      <MarkdownRenderer
                        content={msg.content}
                        className={msg.role === "user" ? "prose-sm text-primary-foreground" : "prose-sm"}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="flex gap-2 px-6 pb-6 pt-4 shrink-0 border-t">
            <Input
              value={supportInput}
              onChange={(e) => setSupportInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendSupportMessage()}
              placeholder={t.typeMessage}
              className="rounded-xl"
              disabled={isSendingSupport}
            />
            <Button
              onClick={sendSupportMessage}
              disabled={!supportInput.trim() || isSendingSupport}
              size="icon"
              className="rounded-xl shrink-0"
            >
              {isSendingSupport ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4" />}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cell Survey Dialog */}
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
