"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, GitBranch, Crown, UserPlus, Check, X, Loader2, AlertCircle, ChevronRight } from "lucide-react"
import type { Group, GroupMember, GroupJoinRequest } from "@/lib/types"
import {
  PRIMARY_CELL_LIMIT,
  SECONDARY_CELL_LIMIT,
  createSecondaryCell,
  getCellHierarchy,
  getPendingJoinRequests,
} from "@/lib/cell-management"
import { useSettings } from "@/components/settings-provider"

interface CellManagementPanelProps {
  group: Group
  members: GroupMember[]
  currentUserId: string
  isAdmin: boolean
}

const translations = {
  ar: {
    cellManagement: "إدارة الخلايا",
    primaryCell: "الخلية الأساسية",
    secondaryCell: "خلية فرعية",
    members: "الأعضاء",
    capacity: "السعة",
    full: "ممتلئة",
    available: "متاحة",
    createSecondary: "إنشاء خلية فرعية",
    secondaryCells: "الخلايا الفرعية",
    noSecondary: "لا توجد خلايا فرعية",
    createFirst: "أنشئ أول خلية فرعية عندما تمتلئ الخلية الأساسية",
    cellName: "اسم الخلية",
    selectSupervisor: "اختر المشرف",
    supervisor: "المشرف",
    create: "إنشاء",
    creating: "جاري الإنشاء...",
    joinRequests: "طلبات الانضمام",
    noRequests: "لا توجد طلبات",
    approve: "قبول",
    reject: "رفض",
    redirect: "توجيه لخلية فرعية",
    pendingRequests: "طلبات معلقة",
    totalMembers: "إجمالي الأعضاء",
    hierarchy: "الهيكل الهرمي",
  },
  en: {
    cellManagement: "Cell Management",
    primaryCell: "Primary Cell",
    secondaryCell: "Secondary Cell",
    members: "Members",
    capacity: "Capacity",
    full: "Full",
    available: "Available",
    createSecondary: "Create Secondary Cell",
    secondaryCells: "Secondary Cells",
    noSecondary: "No secondary cells",
    createFirst: "Create first secondary cell when primary is full",
    cellName: "Cell Name",
    selectSupervisor: "Select Supervisor",
    supervisor: "Supervisor",
    create: "Create",
    creating: "Creating...",
    joinRequests: "Join Requests",
    noRequests: "No requests",
    approve: "Approve",
    reject: "Reject",
    redirect: "Redirect to Secondary",
    pendingRequests: "Pending Requests",
    totalMembers: "Total Members",
    hierarchy: "Hierarchy",
  },
  fr: {
    cellManagement: "Gestion des Cellules",
    primaryCell: "Cellule Principale",
    secondaryCell: "Cellule Secondaire",
    members: "Membres",
    capacity: "Capacité",
    full: "Pleine",
    available: "Disponible",
    createSecondary: "Créer une Cellule Secondaire",
    secondaryCells: "Cellules Secondaires",
    noSecondary: "Aucune cellule secondaire",
    createFirst: "Créez la première cellule secondaire quand la principale est pleine",
    cellName: "Nom de la Cellule",
    selectSupervisor: "Sélectionner le Superviseur",
    supervisor: "Superviseur",
    create: "Créer",
    creating: "Création...",
    joinRequests: "Demandes d'Adhésion",
    noRequests: "Aucune demande",
    approve: "Approuver",
    reject: "Rejeter",
    redirect: "Rediriger vers Secondaire",
    pendingRequests: "Demandes en Attente",
    totalMembers: "Total des Membres",
    hierarchy: "Hiérarchie",
  },
}

export function CellManagementPanel({ group, members, currentUserId, isAdmin }: CellManagementPanelProps) {
  const [secondaryCells, setSecondaryCells] = useState<Group[]>([])
  const [joinRequests, setJoinRequests] = useState<GroupJoinRequest[]>([])
  const [totalMembers, setTotalMembers] = useState(members.length)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [newCellName, setNewCellName] = useState("")
  const [selectedSupervisor, setSelectedSupervisor] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [isProcessing, setIsProcessing] = useState<string | null>(null)
  const supabase = createClient()
  const { language } = useSettings()
  const t = translations[language]

  const isPrimary = group.group_type === "primary"
  const maxMembers = group.max_members || (isPrimary ? PRIMARY_CELL_LIMIT : SECONDARY_CELL_LIMIT)
  const capacityPercent = (members.length / maxMembers) * 100
  const isFull = members.length >= maxMembers

  useEffect(() => {
    if (isPrimary) {
      loadHierarchy()
      loadJoinRequests()
    }
  }, [group.id, isPrimary])

  const loadHierarchy = async () => {
    const hierarchy = await getCellHierarchy(group.id)
    setSecondaryCells(hierarchy.secondary)
    setTotalMembers(hierarchy.totalMembers)
  }

  const loadJoinRequests = async () => {
    const requests = await getPendingJoinRequests(group.id)
    setJoinRequests(requests)
  }

  const handleCreateSecondary = async () => {
    if (!newCellName.trim() || !selectedSupervisor) return

    setIsCreating(true)
    const result = await createSecondaryCell(group.id, newCellName, selectedSupervisor, currentUserId)

    if (result.success) {
      setIsCreateOpen(false)
      setNewCellName("")
      setSelectedSupervisor("")
      loadHierarchy()
    }
    setIsCreating(false)
  }

  const handleApproveRequest = async (request: GroupJoinRequest, redirectTo?: string) => {
    setIsProcessing(request.id)

    if (redirectTo) {
      // Redirect to secondary cell
      await supabase.from("group_members").insert({
        group_id: redirectTo,
        user_id: request.user_id,
        role: "member",
      })

      await supabase
        .from("group_join_requests")
        .update({
          status: "redirected",
          redirected_to: redirectTo,
          processed_at: new Date().toISOString(),
          processed_by: currentUserId,
        })
        .eq("id", request.id)
    } else if (!isFull) {
      // Add to primary cell
      await supabase.from("group_members").insert({
        group_id: group.id,
        user_id: request.user_id,
        role: "member",
      })

      await supabase
        .from("group_join_requests")
        .update({
          status: "approved",
          processed_at: new Date().toISOString(),
          processed_by: currentUserId,
        })
        .eq("id", request.id)
    }

    // Notify user
    await supabase.from("notifications").insert({
      user_id: request.user_id,
      type: "group_join",
      title: "تم قبول طلبك",
      body: `تم قبول طلب انضمامك`,
      group_id: redirectTo || group.id,
      sender_id: currentUserId,
      data: {},
    })

    loadJoinRequests()
    loadHierarchy()
    setIsProcessing(null)
  }

  const handleRejectRequest = async (request: GroupJoinRequest) => {
    setIsProcessing(request.id)

    await supabase
      .from("group_join_requests")
      .update({
        status: "rejected",
        processed_at: new Date().toISOString(),
        processed_by: currentUserId,
      })
      .eq("id", request.id)

    await supabase.from("notifications").insert({
      user_id: request.user_id,
      type: "system",
      title: "تم رفض طلبك",
      body: `تم رفض طلب انضمامك إلى "${group.name}"`,
      group_id: group.id,
      sender_id: currentUserId,
      data: {},
    })

    loadJoinRequests()
    setIsProcessing(null)
  }

  console.log("[v0] CellManagementPanel - group.group_type:", group.group_type)
  console.log("[v0] CellManagementPanel - isPrimary:", isPrimary)
  console.log("[v0] CellManagementPanel - isAdmin:", isAdmin)
  console.log("[v0] CellManagementPanel - maxMembers:", maxMembers)
  console.log("[v0] CellManagementPanel - members.length:", members.length)

  if (!isAdmin) return null

  return (
    <div className="space-y-6 p-4">
      {/* Cell Status Card */}
      <div className="bg-card rounded-xl p-4 border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {isPrimary ? <Crown className="w-5 h-5 text-amber-500" /> : <GitBranch className="w-5 h-5 text-blue-500" />}
            <span className="font-semibold">{isPrimary ? t.primaryCell : t.secondaryCell}</span>
          </div>
          <Badge variant={isFull ? "destructive" : "secondary"}>{isFull ? t.full : t.available}</Badge>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t.capacity}</span>
            <span className="font-medium">
              {members.length} / {maxMembers}
            </span>
          </div>
          <Progress value={capacityPercent} className="h-2" />
        </div>

        {isPrimary && (
          <div className="mt-3 pt-3 border-t flex justify-between text-sm">
            <span className="text-muted-foreground">{t.totalMembers}</span>
            <span className="font-medium">{totalMembers}</span>
          </div>
        )}
      </div>

      {/* Secondary Cells Section - Only for Primary */}
      {isPrimary && isAdmin && (
        <div className="bg-card rounded-xl border">
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-2">
              <GitBranch className="w-5 h-5 text-muted-foreground" />
              <span className="font-semibold">{t.secondaryCells}</span>
              {secondaryCells.length > 0 && <Badge variant="secondary">{secondaryCells.length}</Badge>}
            </div>

            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="gap-1 bg-transparent">
                  <Plus className="w-4 h-4" />
                  {t.createSecondary}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t.createSecondary}</DialogTitle>
                  <DialogDescription>{t.createFirst}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>{t.cellName}</Label>
                    <Input
                      value={newCellName}
                      onChange={(e) => setNewCellName(e.target.value)}
                      placeholder={`${group.name} - 2`}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t.selectSupervisor}</Label>
                    <Select value={selectedSupervisor} onValueChange={setSelectedSupervisor}>
                      <SelectTrigger>
                        <SelectValue placeholder={t.selectSupervisor} />
                      </SelectTrigger>
                      <SelectContent>
                        {members
                          .filter((m) => m.user_id !== currentUserId)
                          .map((member) => (
                            <SelectItem key={member.user_id} value={member.user_id}>
                              <div className="flex items-center gap-2">
                                <Avatar className="h-6 w-6">
                                  <AvatarImage src={member.profile?.avatar_url || ""} />
                                  <AvatarFallback>{member.profile?.display_name?.charAt(0) || "U"}</AvatarFallback>
                                </Avatar>
                                <span>{member.profile?.display_name || "User"}</span>
                              </div>
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={handleCreateSecondary}
                    disabled={!newCellName.trim() || !selectedSupervisor || isCreating}
                    className="w-full"
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
          </div>

          <ScrollArea className="max-h-60">
            {secondaryCells.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <GitBranch className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">{t.noSecondary}</p>
              </div>
            ) : (
              <div className="divide-y">
                {secondaryCells.map((cell) => (
                  <div key={cell.id} className="flex items-center justify-between p-3 hover:bg-secondary/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                        <GitBranch className="w-5 h-5 text-blue-500" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{cell.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {cell.member_count || 0} / {cell.max_members || SECONDARY_CELL_LIMIT} {t.members}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      )}

      {/* Join Requests Section - Only for Primary */}
      {isPrimary && isAdmin && joinRequests.length > 0 && (
        <div className="bg-card rounded-xl border">
          <div className="flex items-center gap-2 p-4 border-b">
            <UserPlus className="w-5 h-5 text-muted-foreground" />
            <span className="font-semibold">{t.joinRequests}</span>
            <Badge variant="destructive">{joinRequests.length}</Badge>
          </div>

          <ScrollArea className="max-h-60">
            <div className="divide-y">
              {joinRequests.map((request) => (
                <div key={request.id} className="p-3">
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={request.profile?.avatar_url || ""} />
                      <AvatarFallback>{request.profile?.display_name?.charAt(0) || "U"}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{request.profile?.display_name || "User"}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(request.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {!isFull && (
                      <Button
                        size="sm"
                        onClick={() => handleApproveRequest(request)}
                        disabled={isProcessing === request.id}
                      >
                        {isProcessing === request.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Check className="w-4 h-4 ml-1" />
                            {t.approve}
                          </>
                        )}
                      </Button>
                    )}

                    {secondaryCells.length > 0 && (
                      <Select
                        onValueChange={(cellId) => handleApproveRequest(request, cellId)}
                        disabled={isProcessing === request.id}
                      >
                        <SelectTrigger className="w-auto">
                          <SelectValue placeholder={t.redirect} />
                        </SelectTrigger>
                        <SelectContent>
                          {secondaryCells.map((cell) => (
                            <SelectItem key={cell.id} value={cell.id}>
                              {cell.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRejectRequest(request)}
                      disabled={isProcessing === request.id}
                    >
                      <X className="w-4 h-4 ml-1" />
                      {t.reject}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Cell Full Warning */}
      {isFull && isAdmin && secondaryCells.length === 0 && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
            <div>
              <p className="font-medium text-amber-500">الخلية ممتلئة</p>
              <p className="text-sm text-muted-foreground mt-1">أنشئ خلية فرعية لاستيعاب الأعضاء الجدد</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
