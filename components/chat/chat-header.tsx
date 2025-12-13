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
import { Users, MoreVertical, UserPlus, Settings, Copy, Check, LogOut, Download } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import type { Group, GroupMember } from "@/lib/types"
import { cn } from "@/lib/utils"
import { GroupMetricsDisplay } from "./group-metrics-display"

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
  const router = useRouter()
  const supabase = createClient()
  const [metricsEnabled, setMetricsEnabled] = useState(false)

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
      mod.getSystemSetting("metrics_enabled").then(setMetricsEnabled)
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
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-sm md:text-base truncate">{group.name}</h1>
              {group.cell_category && (
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

        <div className="flex items-center gap-1 shrink-0">
          {canInstall && (
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-xl"
              onClick={handleInstall}
              title="تثبيت التطبيق"
            >
              <Download className="h-4 w-4" />
            </Button>
          )}

          {/* Members Sheet */}
          <Sheet open={isMembersOpen} onOpenChange={setIsMembersOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl" title="الأعضاء">
                <Users className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[85vw] max-w-sm p-0">
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
                      <div
                        key={member.id}
                        className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary transition-colors"
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
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>

              {members.length < group.max_members && (
                <div className="p-4 border-t">
                  <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
                    <DialogTrigger asChild>
                      <Button className="w-full rounded-xl h-11">
                        <UserPlus className="w-4 h-4 ml-2" />
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
                              {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              )}
            </SheetContent>
          </Sheet>

          {/* More Options */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl" title="المزيد">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuItem asChild>
                <Link href={`/chat/${group.id}/settings`} className="flex items-center cursor-pointer">
                  <Settings className="h-4 w-4 ml-2" />
                  إعدادات المجموعة
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive cursor-pointer"
                onClick={handleLeaveGroup}
                disabled={isLeaving}
              >
                <LogOut className="h-4 w-4 ml-2" />
                {isLeaving ? "جاري المغادرة..." : "مغادرة المجموعة"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {metricsEnabled && (
        <div className="px-3 md:px-4 pb-3">
          <GroupMetricsDisplay group={group} />
        </div>
      )}
    </div>
  )
}
