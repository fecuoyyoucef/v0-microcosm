"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import {
  Users,
  MessageSquare,
  FolderOpen,
  Vote,
  Bell,
  LogOut,
  RefreshCw,
  Send,
  Trash2,
  Database,
  ExternalLink,
  Plus,
  Check,
  Clock,
  AlertCircle,
  Loader2,
  TrendingUp,
  Layers,
  X,
  Settings,
  Eye,
  EyeOff,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"

interface Stats {
  users: number
  groups: number
  messages: number
  decisions: number
  messagesByLayer: {
    social: number
    coordination: number
    knowledge: number
  }
  adminEmail: string
}

interface DevNote {
  id: string
  content: string
  status: "pending" | "in_progress" | "done" | "cancelled"
  priority: "low" | "normal" | "high" | "urgent"
  created_at: string
}

interface RecentItem {
  id: string
  display_name?: string
  name?: string
  content?: string
  avatar_url?: string
  created_at: string
  layer?: string
}

export default function AdminDashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<Stats | null>(null)
  const [recentUsers, setRecentUsers] = useState<RecentItem[]>([])
  const [recentGroups, setRecentGroups] = useState<RecentItem[]>([])
  const [recentMessages, setRecentMessages] = useState<RecentItem[]>([])
  const [devNotes, setDevNotes] = useState<DevNote[]>([])
  const [newNote, setNewNote] = useState("")
  const [notificationOpen, setNotificationOpen] = useState(false)
  const [notifTitle, setNotifTitle] = useState("")
  const [notifBody, setNotifBody] = useState("")
  const [notifTarget, setNotifTarget] = useState("all")
  const [notifPriority, setNotifPriority] = useState("normal")
  const [sendingNotif, setSendingNotif] = useState(false)

  const [settingsOpen, setSettingsOpen] = useState(false)
  const [newAdminEmail, setNewAdminEmail] = useState("")
  const [newAdminPassword, setNewAdminPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [savingSettings, setSavingSettings] = useState(false)
  const [currentAdminEmail, setCurrentAdminEmail] = useState("")

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/stats")
      if (!res.ok) {
        if (res.status === 401) {
          router.push("/admin/login")
          return
        }
        throw new Error("Failed to fetch stats")
      }
      const data = await res.json()
      setStats(data.stats)
      setRecentUsers(data.recent.users)
      setRecentGroups(data.recent.groups)
      setRecentMessages(data.recent.messages)
      if (data.adminEmail) {
        setCurrentAdminEmail(data.adminEmail)
        setNewAdminEmail(data.adminEmail)
      }
    } catch (error) {
      console.error("Stats error:", error)
    } finally {
      setLoading(false)
    }
  }, [router])

  const fetchDevNotes = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/dev-notes")
      if (res.ok) {
        const data = await res.json()
        setDevNotes(data.notes || [])
      }
    } catch (error) {
      console.error("Dev notes error:", error)
    }
  }, [])

  useEffect(() => {
    fetchStats()
    fetchDevNotes()
  }, [fetchStats, fetchDevNotes])

  const handleLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" })
    router.push("/admin/login")
  }

  const handleSendNotification = async () => {
    if (!notifTitle) return

    setSendingNotif(true)
    try {
      const res = await fetch("/api/admin/send-notification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: notifTitle,
          body: notifBody,
          target: notifTarget,
          priority: notifPriority,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        alert(`تم إرسال الإشعار إلى ${data.recipientsCount} مستخدم`)
        setNotificationOpen(false)
        setNotifTitle("")
        setNotifBody("")
      } else {
        alert("فشل إرسال الإشعار")
      }
    } catch {
      alert("حدث خطأ")
    } finally {
      setSendingNotif(false)
    }
  }

  const handleAddNote = async () => {
    if (!newNote.trim()) return

    try {
      const res = await fetch("/api/admin/dev-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newNote }),
      })

      if (res.ok) {
        setNewNote("")
        fetchDevNotes()
      }
    } catch {
      alert("فشل إضافة الملاحظة")
    }
  }

  const handleUpdateNoteStatus = async (id: string, status: string) => {
    try {
      await fetch("/api/admin/dev-notes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      })
      fetchDevNotes()
    } catch {
      alert("فشل التحديث")
    }
  }

  const handleDeleteNote = async (id: string) => {
    try {
      await fetch(`/api/admin/dev-notes?id=${id}`, { method: "DELETE" })
      fetchDevNotes()
    } catch {
      alert("فشل الحذف")
    }
  }

  const handleUpdateAdminCredentials = async () => {
    if (!newAdminEmail) {
      alert("البريد الإلكتروني مطلوب")
      return
    }

    setSavingSettings(true)
    try {
      const res = await fetch("/api/admin/update-credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: newAdminEmail,
          password: newAdminPassword || undefined,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        alert("تم تحديث بيانات الأدمن بنجاح")
        setSettingsOpen(false)
        setNewAdminPassword("")
        // If email changed, logout
        if (newAdminEmail !== currentAdminEmail) {
          alert("تم تغيير البريد الإلكتروني. سيتم تسجيل خروجك الآن.")
          handleLogout()
        } else {
          setCurrentAdminEmail(newAdminEmail)
        }
      } else {
        alert(data.error || "فشل تحديث البيانات")
      }
    } catch {
      alert("حدث خطأ")
    } finally {
      setSavingSettings(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
      </div>
    )
  }

  const statusColors = {
    pending: "bg-yellow-500/20 text-yellow-400",
    in_progress: "bg-blue-500/20 text-blue-400",
    done: "bg-green-500/20 text-green-400",
    cancelled: "bg-red-500/20 text-red-400",
  }

  const statusIcons = {
    pending: Clock,
    in_progress: RefreshCw,
    done: Check,
    cancelled: X,
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white" dir="rtl">
      {/* Header */}
      <header className="bg-slate-800/50 border-b border-slate-700 sticky top-0 z-50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden">
              <Image src="/icons/icon-96x96.png" alt="Synaptic Space" width={40} height={40} />
            </div>
            <div>
              <h1 className="font-bold text-lg">Synaptic Space</h1>
              <p className="text-xs text-slate-400">لوحة تحكم المالك</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                  <Settings className="w-5 h-5" />
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-800 border-slate-700 text-white">
                <DialogHeader>
                  <DialogTitle>إعدادات الأدمن</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>البريد الإلكتروني للأدمن</Label>
                    <Input
                      type="email"
                      value={newAdminEmail}
                      onChange={(e) => setNewAdminEmail(e.target.value)}
                      placeholder="admin@example.com"
                      className="bg-slate-700 border-slate-600"
                      dir="ltr"
                    />
                    <p className="text-xs text-slate-400">
                      تغيير البريد سيغير الأدمن ولن يعود الأدمن القديم قادراً على الدخول
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>كلمة المرور الجديدة (اختياري)</Label>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        value={newAdminPassword}
                        onChange={(e) => setNewAdminPassword(e.target.value)}
                        placeholder="اتركها فارغة للإبقاء على الحالية"
                        className="bg-slate-700 border-slate-600 pl-10"
                        dir="ltr"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                    <p className="text-xs text-yellow-400">
                      تحذير: تغيير البريد الإلكتروني سينقل صلاحيات الأدمن للبريد الجديد فقط.
                    </p>
                  </div>

                  <Button
                    onClick={handleUpdateAdminCredentials}
                    disabled={savingSettings || !newAdminEmail}
                    className="w-full bg-cyan-600 hover:bg-cyan-700"
                  >
                    {savingSettings ? (
                      <Loader2 className="w-4 h-4 animate-spin ml-2" />
                    ) : (
                      <Check className="w-4 h-4 ml-2" />
                    )}
                    حفظ التغييرات
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Button variant="ghost" size="icon" onClick={fetchStats} className="text-slate-400 hover:text-white">
              <RefreshCw className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleLogout} className="text-slate-400 hover:text-red-400">
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">المستخدمين</p>
                  <p className="text-3xl font-bold text-white">{stats?.users || 0}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">الخلايا</p>
                  <p className="text-3xl font-bold text-white">{stats?.groups || 0}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                  <FolderOpen className="w-6 h-6 text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">الرسائل</p>
                  <p className="text-3xl font-bold text-white">{stats?.messages || 0}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                  <MessageSquare className="w-6 h-6 text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">القرارات</p>
                  <p className="text-3xl font-bold text-white">{stats?.decisions || 0}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center">
                  <Vote className="w-6 h-6 text-orange-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Messages by Layer */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Layers className="w-5 h-5 text-cyan-400" />
              الرسائل حسب الطبقة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20">
                <p className="text-green-400 text-sm">اجتماعية</p>
                <p className="text-2xl font-bold text-white">{stats?.messagesByLayer?.social || 0}</p>
              </div>
              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                <p className="text-blue-400 text-sm">تنسيقية</p>
                <p className="text-2xl font-bold text-white">{stats?.messagesByLayer?.coordination || 0}</p>
              </div>
              <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
                <p className="text-purple-400 text-sm">معرفية</p>
                <p className="text-2xl font-bold text-white">{stats?.messagesByLayer?.knowledge || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-cyan-400" />
              إجراءات سريعة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Dialog open={notificationOpen} onOpenChange={setNotificationOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="h-auto py-4 flex flex-col items-center gap-2 bg-slate-700/50 border-slate-600 hover:bg-slate-700"
                  >
                    <Bell className="w-6 h-6 text-yellow-400" />
                    <span className="text-sm">إرسال إشعار</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-slate-800 border-slate-700 text-white">
                  <DialogHeader>
                    <DialogTitle>إرسال إشعار للمستخدمين</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <Input
                      placeholder="العنوان"
                      value={notifTitle}
                      onChange={(e) => setNotifTitle(e.target.value)}
                      className="bg-slate-700 border-slate-600"
                    />
                    <Textarea
                      placeholder="الرسالة"
                      value={notifBody}
                      onChange={(e) => setNotifBody(e.target.value)}
                      className="bg-slate-700 border-slate-600"
                      rows={3}
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <Select value={notifTarget} onValueChange={setNotifTarget}>
                        <SelectTrigger className="bg-slate-700 border-slate-600">
                          <SelectValue placeholder="الهدف" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-700 border-slate-600">
                          <SelectItem value="all">الكل</SelectItem>
                          <SelectItem value="android">Android</SelectItem>
                          <SelectItem value="ios">iOS</SelectItem>
                          <SelectItem value="web">Web</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={notifPriority} onValueChange={setNotifPriority}>
                        <SelectTrigger className="bg-slate-700 border-slate-600">
                          <SelectValue placeholder="الأولوية" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-700 border-slate-600">
                          <SelectItem value="normal">عادي</SelectItem>
                          <SelectItem value="high">عالي</SelectItem>
                          <SelectItem value="urgent">عاجل</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      onClick={handleSendNotification}
                      disabled={!notifTitle || sendingNotif}
                      className="w-full bg-cyan-600 hover:bg-cyan-700"
                    >
                      {sendingNotif ? (
                        <Loader2 className="w-4 h-4 animate-spin ml-2" />
                      ) : (
                        <Send className="w-4 h-4 ml-2" />
                      )}
                      إرسال الآن
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <Button
                variant="outline"
                className="h-auto py-4 flex flex-col items-center gap-2 bg-slate-700/50 border-slate-600 hover:bg-slate-700"
                onClick={() =>
                  window.open(
                    `https://supabase.com/dashboard/project/${process.env.NEXT_PUBLIC_SUPABASE_URL?.split("//")[1]?.split(".")[0]}`,
                    "_blank",
                  )
                }
              >
                <Database className="w-6 h-6 text-green-400" />
                <span className="text-sm">Supabase</span>
              </Button>

              <Button
                variant="outline"
                className="h-auto py-4 flex flex-col items-center gap-2 bg-slate-700/50 border-slate-600 hover:bg-slate-700"
                onClick={() => window.open("https://vercel.com/dashboard", "_blank")}
              >
                <ExternalLink className="w-6 h-6 text-white" />
                <span className="text-sm">Vercel</span>
              </Button>

              <Button
                variant="outline"
                className="h-auto py-4 flex flex-col items-center gap-2 bg-slate-700/50 border-slate-600 hover:bg-red-900/50"
                onClick={() => {
                  if (confirm("هل أنت متأكد من مسح جميع البيانات؟")) {
                    alert("هذه الميزة غير مفعلة للأمان")
                  }
                }}
              >
                <Trash2 className="w-6 h-6 text-red-400" />
                <span className="text-sm">مسح الكل</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">النشاط الأخير</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Recent Users */}
              <div>
                <p className="text-sm text-slate-400 mb-2">آخر المستخدمين</p>
                <div className="space-y-2">
                  {recentUsers.map((user) => (
                    <div key={user.id} className="flex items-center gap-3 p-2 rounded-lg bg-slate-700/30">
                      <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center text-sm">
                        {user.display_name?.[0] || "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{user.display_name || "بدون اسم"}</p>
                        <p className="text-xs text-slate-500">{new Date(user.created_at).toLocaleDateString("ar")}</p>
                      </div>
                    </div>
                  ))}
                  {recentUsers.length === 0 && <p className="text-slate-500 text-sm">لا يوجد مستخدمين</p>}
                </div>
              </div>

              {/* Recent Groups */}
              <div>
                <p className="text-sm text-slate-400 mb-2">آخر الخلايا</p>
                <div className="space-y-2">
                  {recentGroups.map((group) => (
                    <div key={group.id} className="flex items-center gap-3 p-2 rounded-lg bg-slate-700/30">
                      <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                        <FolderOpen className="w-4 h-4 text-purple-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{group.name}</p>
                        <p className="text-xs text-slate-500">{new Date(group.created_at).toLocaleDateString("ar")}</p>
                      </div>
                    </div>
                  ))}
                  {recentGroups.length === 0 && <p className="text-slate-500 text-sm">لا يوجد خلايا</p>}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dev Notes */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-400" />
                ملاحظات التطوير
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-4">
                <Input
                  placeholder="أضف ملاحظة جديدة..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  className="bg-slate-700 border-slate-600"
                  onKeyDown={(e) => e.key === "Enter" && handleAddNote()}
                />
                <Button onClick={handleAddNote} size="icon" className="bg-cyan-600 hover:bg-cyan-700">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto">
                {devNotes.map((note) => {
                  const StatusIcon = statusIcons[note.status]
                  return (
                    <div key={note.id} className="p-3 rounded-lg bg-slate-700/30 group">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm flex-1">{note.content}</p>
                        <button
                          onClick={() => handleDeleteNote(note.id)}
                          className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-opacity"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <Select value={note.status} onValueChange={(v) => handleUpdateNoteStatus(note.id, v)}>
                          <SelectTrigger className={`h-7 text-xs w-auto px-2 border-0 ${statusColors[note.status]}`}>
                            <StatusIcon className="w-3 h-3 ml-1" />
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-700 border-slate-600">
                            <SelectItem value="pending">قيد الانتظار</SelectItem>
                            <SelectItem value="in_progress">قيد التنفيذ</SelectItem>
                            <SelectItem value="done">مكتمل</SelectItem>
                            <SelectItem value="cancelled">ملغي</SelectItem>
                          </SelectContent>
                        </Select>
                        <span className="text-xs text-slate-500">
                          {new Date(note.created_at).toLocaleDateString("ar")}
                        </span>
                      </div>
                    </div>
                  )
                })}
                {devNotes.length === 0 && <p className="text-slate-500 text-sm text-center py-4">لا توجد ملاحظات</p>}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
