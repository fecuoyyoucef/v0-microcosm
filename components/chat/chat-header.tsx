"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  UsersIcon,
  EllipsisVerticalIcon as MoreVerticalIcon,
  UserPlusIcon,
  Cog6ToothIcon as SettingsIcon,
  ClipboardDocumentIcon as CopyIcon,
  CheckIcon,
  ArrowLeftOnRectangleIcon as LogOutIcon,
  ArrowDownTrayIcon as DownloadIcon,
  ChartBarIcon as GaugeIconHero,
  ArrowPathIcon as Loader2Icon,
} from "@heroicons/react/24/outline"
import Link from "next/link"
import { useRouter } from "next/navigation"
import type { Group, GroupMember } from "@/lib/types"
import { cn } from "@/lib/utils"
import { MetricCard } from "@/components/ui/metric-card"

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

interface ChatHeaderProps {
  group: Group
  members: GroupMember[]
  currentUserRole: "admin" | "member"
  currentUserId: string
  onMembersUpdate?: () => void
}

export function ChatHeader({ group, members, currentUserRole, currentUserId, onMembersUpdate }: ChatHeaderProps) {
  const [isInviteOpen, setIsInviteOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)
  const [isMembersOpen, setIsMembersOpen] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [canInstall, setCanInstall] = useState(false)
  const [selectedMetric, setSelectedMetric] = useState<"responsibility" | "progress" | null>(null)
  const router = useRouter()
  const supabase = createClient()
  const [metricsEnabled, setMetricsEnabled] = useState(false)
  const [classificationEnabled, setClassificationEnabled] = useState(false)
  const [discussionQuality, setDiscussionQuality] = useState<number | null>(null)
  const [isAssessingQuality, setIsAssessingQuality] = useState(false)
  const [showQualityDialog, setShowQualityDialog] = useState(false)

  useEffect(() => {
    // Check if already in standalone mode (installed)
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true

    if (isStandalone) {
      setCanInstall(false)
      return
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setCanInstall(true)
    }

    const handleAppInstalled = () => {
      setCanInstall(false)
      setDeferredPrompt(null)
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    window.addEventListener("appinstalled", handleAppInstalled)

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
      window.removeEventListener("appinstalled", handleAppInstalled)
    }
  }, [])

  useEffect(() => {
    import("@/lib/system-settings").then((mod) => {
      mod.getSystemSetting("cell_metrics_enabled").then((enabled) => {
        setMetricsEnabled(enabled)
        console.log("[v0] Cell metrics enabled:", enabled)
      })
      mod.getSystemSetting("cell_classification_enabled").then((enabled) => {
        setClassificationEnabled(enabled)
        console.log("[v0] Cell classification enabled:", enabled)
      })
    })
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === "accepted") {
      setCanInstall(false)
    }
    setDeferredPrompt(null)
  }

  const inviteLink = typeof window !== "undefined" ? `${window.location.origin}/invite/${group.id}` : ""

  const copyInviteLink = async () => {
    await navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleLeaveGroup = async () => {
    if (!confirm("هل أنت متأكد من مغادرة المجموعة؟")) return

    setIsLeaving(true)
    try {
      const { error } = await supabase
        .from("group_members")
        .delete()
        .eq("group_id", group.id)
        .eq("user_id", currentUserId)

      if (error) throw error

      router.push("/chat")
      router.refresh()
    } catch (err) {
      console.error("Error leaving group:", err)
      alert("حدث خطأ في مغادرة المجموعة")
    } finally {
      setIsLeaving(false)
    }
  }

  const getGroupInitials = () => {
    return group.name.charAt(0).toUpperCase()
  }

  const getGroupColor = () => {
    const colors = [
      "from-blue-500 to-blue-600",
      "from-emerald-500 to-emerald-600",
      "from-violet-500 to-violet-600",
      "from-amber-500 to-amber-600",
      "from-rose-500 to-rose-600",
      "from-cyan-500 to-cyan-600",
    ]
    const index = group.name.charCodeAt(0) % colors.length
    return colors[index]
  }

  const onlineCount = Math.min(members.length, Math.ceil(members.length * 0.6))

  const getMetricColor = (val: number) => {
    if (val > 90) return "bg-blue-500/20 border-blue-500/30"
    if (val >= 75) return "bg-green-500/20 border-green-500/30"
    if (val >= 50) return "bg-yellow-500/20 border-yellow-500/30"
    if (val >= 25) return "bg-orange-500/20 border-orange-500/30"
    return "bg-red-500/20 border-red-500/30"
  }

  const handleAssessQuality = async () => {
    setIsAssessingQuality(true)
    try {
      const response = await fetch("/api/ai/assess-discussion-quality", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId: group.id }),
      })

      if (response.ok) {
        const { quality } = await response.json()
        setDiscussionQuality(quality.overall_score)
        setShowQualityDialog(true)
      }
    } catch (error) {
      console.error("Quality assessment error:", error)
    } finally {
      setIsAssessingQuality(false)
    }
  }

  return (
    <div className="shrink-0 border-b border-border/30 bg-black/30 backdrop-blur-xl">
      <div className="h-14 md:h-16 px-3 md:px-4 flex items-center justify-between">
        <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
          {/* Group Avatar */}
          <Avatar className="w-9 h-9 md:w-10 md:h-10 rounded-xl ring-2 ring-background shadow-md shrink-0">
            {group.avatar_url ? (
              <AvatarImage
                src={group.avatar_url || "/placeholder.svg"}
                alt={group.name}
                className="rounded-xl object-cover"
              />
            ) : null}
            <AvatarFallback
              className={cn("rounded-xl bg-gradient-to-br text-white font-bold text-sm md:text-base", getGroupColor())}
            >
              {getGroupInitials()}
            </AvatarFallback>
          </Avatar>

          {/* Group Info */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-bold text-sm md:text-base truncate">{group.name}</h1>
              {classificationEnabled && group.cell_category && (
                <span
                  className={cn(
                    "text-[9px] md:text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0",
                    group.cell_category === "project"
                      ? "bg-blue-500/20 text-blue-300"
                      : "bg-purple-500/20 text-purple-300",
                  )}
                >
                  {group.cell_category === "project" ? "مشروع" : "حوار"}
                </span>
              )}
              {metricsEnabled && (
                <div className="flex gap-1">
                  <MetricCard
                    label="المسؤولية"
                    value={group.responsibility_score ?? 100}
                    size="sm"
                    onClick={() => setSelectedMetric("responsibility")}
                  />
                  {group.cell_category === "project" && (
                    <MetricCard
                      label="التقدم"
                      value={group.progress_score ?? 0}
                      size="sm"
                      onClick={() => setSelectedMetric("progress")}
                    />
                  )}
                </div>
              )}
            </div>
            <p className="text-[10px] md:text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap">
              <span>{members.length} أعضاء</span>
              <span className="text-muted-foreground/50">•</span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {onlineCount} متصل
              </span>
              {group.responsibility_score !== undefined && group.responsibility_score < 75 && (
                <>
                  <span className="text-muted-foreground/50">•</span>
                  <span
                    className={cn(
                      "flex items-center gap-1",
                      group.responsibility_score < 60 ? "text-red-400" : "text-yellow-400",
                    )}
                  >
                    ⚠ {group.responsibility_score}%
                  </span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Metric Details Modal */}
        {selectedMetric && (
          <Dialog open={!!selectedMetric} onOpenChange={(open) => !open && setSelectedMetric(null)}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{selectedMetric === "responsibility" ? "معيار المسؤولية" : "معيار التقدم"}</DialogTitle>
              </DialogHeader>
              <div
                className={cn(
                  "p-6 rounded-xl border space-y-4",
                  selectedMetric === "responsibility"
                    ? "bg-blue-500/20 border-blue-500/30"
                    : "bg-green-500/20 border-green-500/30",
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">النسبة المئوية</span>
                  <span className="text-3xl font-bold">
                    {selectedMetric === "responsibility"
                      ? (group.responsibility_score ?? 100)
                      : (group.progress_score ?? 0)}
                    %
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="w-full bg-black/30 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all"
                      style={{
                        width: `${selectedMetric === "responsibility" ? (group.responsibility_score ?? 100) : (group.progress_score ?? 0)}%`,
                      }}
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {selectedMetric === "responsibility"
                    ? "يحسب بناءً على النشاط والعقود والقرارات المتخذة"
                    : "يحسب بناءً على القرارات المتخذة والعقود المكتملة والمهام المنجزة"}
                </p>
              </div>
            </DialogContent>
          </Dialog>
        )}

        <Dialog open={showQualityDialog} onOpenChange={setShowQualityDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <GaugeIconHero className="w-5 h-5 text-blue-500" />
                تقييم جودة النقاش
              </DialogTitle>
            </DialogHeader>
            {discussionQuality !== null && (
              <div className="space-y-4">
                <div className="p-6 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30">
                  <div className="text-center">
                    <div className="text-5xl font-bold text-blue-500">{discussionQuality}%</div>
                    <p className="text-sm text-muted-foreground mt-2">الدرجة الإجمالية</p>
                  </div>
                  <div className="mt-4 w-full bg-black/30 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all"
                      style={{ width: `${discussionQuality}%` }}
                    />
                  </div>
                </div>
                <p className="text-xs text-center text-muted-foreground">
                  {discussionQuality >= 80 && "نقاش ممتاز! المحادثة متوازنة ومثمرة."}
                  {discussionQuality >= 60 && discussionQuality < 80 && "نقاش جيد. يمكن تحسينه بمزيد من التفاعل."}
                  {discussionQuality >= 40 && discussionQuality < 60 && "نقاش متوسط. يحتاج لمزيد من العمق."}
                  {discussionQuality < 40 && "نقاش ضعيف. يحتاج إلى تحسين كبير."}
                </p>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <div className="flex items-center gap-1 shrink-0">
          {/* Discussion Quality Assessment Button */}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-xl"
            onClick={handleAssessQuality}
            disabled={isAssessingQuality}
            title="تقييم جودة النقاش"
          >
            {isAssessingQuality ? (
              <Loader2Icon className="h-4 w-4 animate-spin" />
            ) : (
              <GaugeIconHero className="h-4 w-4 text-blue-500" />
            )}
          </Button>

          {canInstall && (
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-xl"
              onClick={handleInstall}
              title="تثبيت التطبيق"
            >
              <DownloadIcon className="h-4 w-4" />
            </Button>
          )}

          {/* Members Sheet */}
          <Sheet open={isMembersOpen} onOpenChange={setIsMembersOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl" title="الأعضاء">
                <UsersIcon className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-screen max-w-sm p-0">
              <SheetHeader className="p-4 border-b">
                <SheetTitle>أعضاء المجموعة</SheetTitle>
                <SheetDescription>
                  {members.length} من {group.max_members} عضو
                </SheetDescription>
              </SheetHeader>
              <ScrollArea className="h-[calc(100dvh-180px)]">
                <div className="p-3 space-y-1">
                  {members.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">لا يوجد أعضاء</p>
                  ) : (
                    members.map((member) => (
                      <Link
                        key={member.id}
                        href={`/chat/profile/${member.user_id}`}
                        className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary transition-colors cursor-pointer"
                      >
                        <Avatar className="h-10 w-10 ring-2 ring-background">
                          {member.profile?.avatar_url && (
                            <AvatarImage src={member.profile.avatar_url || "/placeholder.svg"} />
                          )}
                          <AvatarFallback className="bg-primary/20 text-primary font-semibold">
                            {member.profile?.display_name?.charAt(0) || "؟"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{member.profile?.display_name || "مستخدم"}</p>
                          <p className="text-xs text-muted-foreground">{member.role === "admin" ? "مسؤول" : "عضو"}</p>
                        </div>
                        {member.user_id === currentUserId && (
                          <span className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full shrink-0">
                            أنت
                          </span>
                        )}
                      </Link>
                    ))
                  )}
                </div>
              </ScrollArea>

              {members.length < group.max_members && (
                <div className="p-4 border-t">
                  {currentUserRole === "admin" ? (
                    <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
                      <DialogTrigger asChild>
                        <Button className="w-full rounded-xl h-11">
                          <UserPlusIcon className="w-4 h-4 ml-2" />
                          دعوة أعضاء جدد
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle>دعوة أعضاء جدد</DialogTitle>
                          <DialogDescription>شارك رابط الدعوة مع أصدقائك للانضمام للمجموعة</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 mt-4">
                          <div className="space-y-2">
                            <Label>رابط الدعوة</Label>
                            <div className="flex gap-2">
                              <Input
                                value={inviteLink}
                                readOnly
                                className="bg-background text-xs md:text-sm rounded-xl flex-1"
                                dir="ltr"
                              />
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={copyInviteLink}
                                className="rounded-xl bg-transparent shrink-0"
                              >
                                {copied ? (
                                  <CheckIcon className="h-4 w-4 text-emerald-500" />
                                ) : (
                                  <CopyIcon className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  ) : (
                    <div className="text-center text-sm text-muted-foreground py-3">
                      <p>فقط المسؤول يمكنه دعوة أعضاء جدد</p>
                    </div>
                  )}
                </div>
              )}
            </SheetContent>
          </Sheet>

          {/* More Options */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl" title="المزيد">
                <MoreVerticalIcon className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuItem asChild>
                <Link href={`/chat/${group.id}/settings`} className="flex items-center cursor-pointer">
                  <SettingsIcon className="h-4 w-4 ml-2" />
                  إعدادات المجموعة
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive cursor-pointer"
                onClick={handleLeaveGroup}
                disabled={isLeaving}
              >
                <LogOutIcon className="h-4 w-4 ml-2" />
                {isLeaving ? "جاري المغادرة..." : "مغادرة المجموعة"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  )
}
