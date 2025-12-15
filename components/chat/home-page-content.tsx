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
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { SmartRecommendations } from "@/components/groups/smart-recommendations"
import { SuggestedCells } from "@/components/groups/suggested-cells"
import { CellSurveyDialog } from "@/components/groups/cell-survey-dialog"
import { Plus, Users, Search, Loader2, Sparkles } from "lucide-react"
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
  },
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

  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const { language } = useSettings()
  const t = translations[language]

  // Open create dialog if ?new=true
  useEffect(() => {
    if (searchParams.get("new") === "true") {
      setIsCreateDialogOpen(true)
      router.replace("/chat")
    }
  }, [searchParams, router])

  useEffect(() => {
    fetchMemberCounts()
    fetchUnreadCounts()

    // Real-time subscription
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
        setError(groupError.message)
        return
      }

      await supabase.from("group_members").insert({
        group_id: group.id,
        user_id: userId,
        role: "admin",
      })

      setNewGroupName("")
      setNewGroupDescription("")
      setIsCreateDialogOpen(false)
      setGroups((prev) => [...prev, group])
      setNewGroupId(group.id)
      setShowCellSurvey(true)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsCreating(false)
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

  const handleSurveyComplete = () => {
    if (newGroupId) {
      router.push(`/chat/${newGroupId}`)
      setNewGroupId(null)
    }
  }

  return (
    <div className="flex flex-col h-full bg-background pb-16 md:pb-0">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border/50 px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">
              {t.welcome}، {profile?.display_name?.split(" ")[0] || ""}
            </h1>
            <p className="text-sm text-muted-foreground">{t.cells}</p>
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)} size="icon" className="rounded-full h-10 w-10">
            <Plus className="w-5 h-5" />
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.search}
            className="pr-10 bg-muted/50 border-0 rounded-xl h-11"
          />
        </div>
      </header>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-3">
            <Card
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => setIsCreateDialogOpen(true)}
            >
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Plus className="w-5 h-5 text-primary" />
                </div>
                <span className="font-medium">{t.newCell}</span>
              </CardContent>
            </Card>

            <Link href="/chat/assistant">
              <Card className="cursor-pointer hover:bg-muted/50 transition-colors h-full">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-amber-500" />
                  </div>
                  <span className="font-medium">{t.assistant}</span>
                </CardContent>
              </Card>
            </Link>
          </div>

          {/* Suggested Cells */}
          <SuggestedCells userId={userId} />

          {/* Cells List */}
          {filteredGroups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center mb-4">
                <Users className="w-10 h-10 text-muted-foreground" />
              </div>
              <h2 className="text-lg font-semibold mb-2">{searchQuery ? t.noResults : t.noCells}</h2>
              <p className="text-sm text-muted-foreground mb-6 max-w-xs">{!searchQuery && t.createFirst}</p>
              {!searchQuery && (
                <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2 rounded-xl">
                  <Plus className="w-4 h-4" />
                  {t.createCell}
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground px-1">{t.cells}</h3>
              <div className="space-y-2">
                {filteredGroups.map((group) => (
                  <Link key={group.id} href={`/chat/${group.id}`}>
                    <Card className="hover:bg-muted/50 transition-colors">
                      <CardContent className="p-4 flex items-center gap-4">
                        <Avatar className="h-12 w-12 rounded-xl">
                          {group.avatar_url ? (
                            <AvatarImage src={group.avatar_url || "/placeholder.svg"} />
                          ) : (
                            <AvatarFallback
                              className={cn(
                                "rounded-xl bg-gradient-to-br text-white font-bold",
                                getGroupColor(group.name),
                              )}
                            >
                              {group.name.substring(0, 2)}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h3 className="font-semibold truncate">{group.name}</h3>
                            {unreadCounts[group.id] > 0 && (
                              <span className="h-5 min-w-5 px-1.5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">
                                {unreadCounts[group.id]}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {group.description || `${memberCounts[group.id] || 1} ${t.members}`}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Smart Recommendations */}
          {hasCompletedSurvey && <SmartRecommendations userId={userId} />}
        </div>
      </ScrollArea>

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
