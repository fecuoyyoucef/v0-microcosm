"use client"

import type React from "react"
import { useState, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Switch } from "@/components/ui/switch"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  ArrowRight,
  Save,
  Trash2,
  UserMinus,
  Shield,
  Loader2,
  Camera,
  Settings,
  Users,
  BarChart3,
  Download,
  ShieldCheck,
  GitBranch,
  Palette,
} from "lucide-react"
import Link from "next/link"
import type {
  Group,
  GroupMember,
  GroupSettings,
  UpperLayerPermission,
  GroupStatistics,
  BackgroundStyle,
} from "@/lib/types"
import { CellManagementPanel } from "@/components/chat/cell-management-panel"

interface GroupSettingsFormProps {
  group: Group
  members: GroupMember[]
  currentUserId: string
  isAdmin: boolean
}

export function GroupSettingsForm({ group, members: initialMembers, currentUserId, isAdmin }: GroupSettingsFormProps) {
  const [name, setName] = useState(group.name)
  const [description, setDescription] = useState(group.description || "")
  const [avatarUrl, setAvatarUrl] = useState(group.avatar_url || "")
  const [backgroundStyle, setBackgroundStyle] = useState<BackgroundStyle>(group.background_style || "neural_mesh")
  const [settings, setSettings] = useState<GroupSettings>(
    group.settings || {
      upper_layer_permission: "admin_only",
      allow_notebook: true,
      allow_mindmap: true,
      allow_smart_summary: true,
    },
  )
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [removingMember, setRemovingMember] = useState<string | null>(null)
  const [statistics, setStatistics] = useState<GroupStatistics | null>(null)
  const [isLoadingStats, setIsLoadingStats] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !isAdmin) return

    setIsUploadingAvatar(true)
    try {
      const fileExt = file.name.split(".").pop()
      const fileName = `${group.id}-${Date.now()}.${fileExt}`
      const filePath = `${group.id}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from("group-avatars")
        .upload(filePath, file, { upsert: true })

      if (uploadError) throw uploadError

      const {
        data: { publicUrl },
      } = supabase.storage.from("group-avatars").getPublicUrl(filePath)

      setAvatarUrl(publicUrl)
      await supabase.from("groups").update({ avatar_url: publicUrl }).eq("id", group.id)
    } catch (error) {
      console.error("Error uploading avatar:", error)
      alert("حدث خطأ في رفع الصورة")
    } finally {
      setIsUploadingAvatar(false)
    }
  }

  const handleSave = async () => {
    if (!isAdmin) return

    setIsSaving(true)
    try {
      const { error } = await supabase
        .from("groups")
        .update({ name, description, avatar_url: avatarUrl, settings, background_style: backgroundStyle })
        .eq("id", group.id)

      if (error) throw error
      router.refresh()
    } catch (err) {
      console.error("Error updating group:", err)
      alert("حدث خطأ في حفظ التغييرات")
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteGroup = async () => {
    if (!isAdmin) return

    setIsDeleting(true)
    try {
      await supabase.from("messages").delete().eq("group_id", group.id)
      await supabase.from("group_members").delete().eq("group_id", group.id)
      const { error } = await supabase.from("groups").delete().eq("id", group.id)

      if (error) throw error
      router.push("/chat")
    } catch (err) {
      console.error("Error deleting group:", err)
      alert("حدث خطأ في حذف المجموعة")
    } finally {
      setIsDeleting(false)
    }
  }

  const handleRemoveMember = async (memberId: string, userId: string) => {
    if (!isAdmin || userId === currentUserId) return

    setRemovingMember(memberId)
    try {
      const { error } = await supabase.from("group_members").delete().eq("id", memberId)
      if (error) throw error
      router.refresh()
    } catch (err) {
      console.error("Error removing member:", err)
      alert("حدث خطأ في إزالة العضو")
    } finally {
      setRemovingMember(null)
    }
  }

  const handlePromoteToAdmin = async (memberId: string) => {
    if (!isAdmin) return
    try {
      const { error } = await supabase.from("group_members").update({ role: "admin" }).eq("id", memberId)
      if (error) throw error
      router.refresh()
    } catch (err) {
      console.error("Error promoting member:", err)
    }
  }

  const handleDemoteFromAdmin = async (memberId: string) => {
    if (!isAdmin) return
    try {
      const { error } = await supabase.from("group_members").update({ role: "member" }).eq("id", memberId)
      if (error) throw error
      router.refresh()
    } catch (err) {
      console.error("Error demoting member:", err)
    }
  }

  const loadStatistics = async () => {
    setIsLoadingStats(true)
    try {
      const { data: messages } = await supabase
        .from("messages")
        .select("id, layer, sender_id, created_at")
        .eq("group_id", group.id)

      if (messages) {
        const memberStats = new Map<string, number>()
        messages.forEach((m) => {
          memberStats.set(m.sender_id, (memberStats.get(m.sender_id) || 0) + 1)
        })

        const stats: GroupStatistics = {
          totalMessages: messages.length,
          upperMessages: messages.filter((m) => m.layer === "upper").length,
          standardMessages: messages.filter((m) => m.layer === "standard").length,
          shadowMessages: messages.filter((m) => m.layer === "shadow").length,
          memberStats: initialMembers
            .map((m) => ({
              userId: m.user_id,
              displayName: m.profile?.display_name || "مستخدم",
              messageCount: memberStats.get(m.user_id) || 0,
            }))
            .sort((a, b) => b.messageCount - a.messageCount),
          lastActivity:
            messages.length > 0
              ? messages.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
                  .created_at
              : null,
        }
        setStatistics(stats)
      }
    } catch (err) {
      console.error("Error loading statistics:", err)
    } finally {
      setIsLoadingStats(false)
    }
  }

  const handleExportChat = async (format: "json" | "txt") => {
    try {
      const { data: messages } = await supabase
        .from("messages")
        .select("*")
        .eq("group_id", group.id)
        .order("created_at", { ascending: true })

      if (!messages) return

      // Fetch profiles separately
      const senderIds = [...new Set(messages.map((m) => m.sender_id))]
      const { data: profiles } = await supabase.from("profiles").select("*").in("id", senderIds)
      const profileMap = new Map(profiles?.map((p) => [p.id, p]) || [])

      let content: string
      let filename: string
      let mimeType: string

      if (format === "json") {
        const messagesWithSender = messages.map((m) => ({
          ...m,
          sender: profileMap.get(m.sender_id),
        }))
        content = JSON.stringify(
          { group: group.name, messages: messagesWithSender, exportedAt: new Date().toISOString() },
          null,
          2,
        )
        filename = `${group.name}-export.json`
        mimeType = "application/json"
      } else {
        content = messages
          .map((m) => {
            const sender = profileMap.get(m.sender_id)
            return `[${new Date(m.created_at).toLocaleString("ar-EG")}] ${sender?.display_name || "مستخدم"}: ${m.content}`
          })
          .join("\n")
        filename = `${group.name}-export.txt`
        mimeType = "text/plain"
      }

      const blob = new Blob([content], { type: mimeType })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error("Error exporting chat:", err)
    }
  }

  const isPrimaryCell = group.group_type === "primary" || !group.group_type || !group.parent_group_id

  console.log("[v0] Group settings - isAdmin:", isAdmin)
  console.log("[v0] Group settings - isPrimaryCell:", isPrimaryCell)
  console.log("[v0] Group settings - group.group_type:", group.group_type)
  console.log("[v0] Group settings - group.parent_group_id:", group.parent_group_id)
  console.log("[v0] Group settings - Should show cells tab:", isPrimaryCell && isAdmin)

  return (
    <div className="flex-1 bg-background overflow-auto">
      <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-6 pb-20">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href={`/chat/${group.id}`}>
            <Button variant="ghost" size="icon">
              <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl md:text-2xl font-bold">إعدادات الخلية</h1>
            <p className="text-sm text-muted-foreground">إدارة إعدادات خلية {group.name}</p>
          </div>
        </div>

        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-6 h-auto">
            <TabsTrigger value="general" className="text-xs md:text-sm py-2">
              <Settings className="w-4 h-4 md:ml-2" />
              <span className="hidden md:inline">عام</span>
            </TabsTrigger>
            <TabsTrigger value="members" className="text-xs md:text-sm py-2">
              <Users className="w-4 h-4 md:ml-2" />
              <span className="hidden md:inline">الأعضاء</span>
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="cells" className="text-xs md:text-sm py-2">
                <GitBranch className="w-4 h-4 md:ml-2" />
                <span className="hidden md:inline">الخلايا</span>
              </TabsTrigger>
            )}
            <TabsTrigger value="permissions" className="text-xs md:text-sm py-2" disabled={!isAdmin}>
              <ShieldCheck className="w-4 h-4 md:ml-2" />
              <span className="hidden md:inline">الصلاحيات</span>
            </TabsTrigger>
            <TabsTrigger value="stats" className="text-xs md:text-sm py-2" onClick={loadStatistics}>
              <BarChart3 className="w-4 h-4 md:ml-2" />
              <span className="hidden md:inline">الإحصائيات</span>
            </TabsTrigger>
          </TabsList>

          {/* General Tab */}
          <TabsContent value="general" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">صورة الخلية</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center gap-6">
                <div className="relative">
                  <Avatar className="w-20 h-20 md:w-24 md:h-24">
                    <AvatarImage src={avatarUrl || undefined} />
                    <AvatarFallback className="text-2xl bg-primary/20 text-primary">
                      {name?.charAt(0) || "م"}
                    </AvatarFallback>
                  </Avatar>
                  {isAdmin && (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingAvatar}
                      className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90"
                    >
                      {isUploadingAvatar ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Camera className="w-4 h-4" />
                      )}
                    </button>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                </div>
                <div className="text-sm text-muted-foreground">
                  {isAdmin ? "اضغط على أيقونة الكاميرا لتغيير صورة الخلية" : "فقط المسؤول يمكنه تغيير الصورة"}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">معلومات الخلية</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">اسم الخلية</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} disabled={!isAdmin} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">الوصف</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="وصف قصير للخلية..."
                    disabled={!isAdmin}
                  />
                </div>
                {isAdmin && (
                  <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin ml-2" />
                        جاري الحفظ...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 ml-2" />
                        حفظ التغييرات
                      </>
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Background Selection Card */}
            {isAdmin && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Palette className="w-5 h-5" />
                    خلفية الخلية
                  </CardTitle>
                  <CardDescription>اختر الخلفية الديناميكية للمحادثات</CardDescription>
                </CardHeader>
                <CardContent>
                  <RadioGroup
                    value={backgroundStyle}
                    onValueChange={(value) => setBackgroundStyle(value as BackgroundStyle)}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2 space-x-reverse p-3 rounded-lg border hover:bg-secondary cursor-pointer">
                        <RadioGroupItem value="neural_network" id="neural_network" />
                        <Label htmlFor="neural_network" className="flex-1 cursor-pointer">
                          <div className="font-medium">شبكة عصبية (أزرق/بنفسجي)</div>
                          <div className="text-xs text-muted-foreground">خلايا عصبية متصلة بإضاءة متوهجة</div>
                        </Label>
                      </div>

                      <div className="flex items-center space-x-2 space-x-reverse p-3 rounded-lg border hover:bg-secondary cursor-pointer">
                        <RadioGroupItem value="matrix_code" id="matrix_code" />
                        <Label htmlFor="matrix_code" className="flex-1 cursor-pointer">
                          <div className="font-medium">كود ماتريكس (أخضر)</div>
                          <div className="text-xs text-muted-foreground">مكعبات ديجتال مع تأثيرات برمجية</div>
                        </Label>
                      </div>

                      <div className="flex items-center space-x-2 space-x-reverse p-3 rounded-lg border hover:bg-secondary cursor-pointer">
                        <RadioGroupItem value="neuron_cell" id="neuron_cell" />
                        <Label htmlFor="neuron_cell" className="flex-1 cursor-pointer">
                          <div className="font-medium">خلية عصبية (أزرق سماوي)</div>
                          <div className="text-xs text-muted-foreground">خلية عصبية مفصلة مع نبضات ضوئية</div>
                        </Label>
                      </div>

                      <div className="flex items-center space-x-2 space-x-reverse p-3 rounded-lg border hover:bg-secondary cursor-pointer">
                        <RadioGroupItem value="none" id="none" />
                        <Label htmlFor="none" className="flex-1 cursor-pointer">
                          <div className="font-medium">بدون خلفية</div>
                          <div className="text-xs text-muted-foreground">خلفية سادة بدون تأثيرات</div>
                        </Label>
                      </div>
                    </div>
                  </RadioGroup>
                  <Button onClick={handleSave} disabled={isSaving} className="mt-4">
                    {isSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin ml-2" />
                        جاري الحفظ...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 ml-2" />
                        حفظ الخلفية
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Export */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">تصدير المحادثة</CardTitle>
                <CardDescription>تصدير جميع رسائل الخلية</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 flex-wrap">
                  <Button variant="outline" onClick={() => handleExportChat("txt")}>
                    <Download className="h-4 w-4 ml-2" />
                    تصدير نص
                  </Button>
                  <Button variant="outline" onClick={() => handleExportChat("json")}>
                    <Download className="h-4 w-4 ml-2" />
                    تصدير JSON
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Danger Zone */}
            {isAdmin && (
              <Card className="border-destructive/50">
                <CardHeader>
                  <CardTitle className="text-destructive">منطقة الخطر</CardTitle>
                </CardHeader>
                <CardContent>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" disabled={isDeleting}>
                        {isDeleting ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin ml-2" />
                            جاري الحذف...
                          </>
                        ) : (
                          <>
                            <Trash2 className="h-4 w-4 ml-2" />
                            حذف الخلية
                          </>
                        )}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
                        <AlertDialogDescription>سيتم حذف الخلية وجميع الرسائل نهائياً.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>إلغاء</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDeleteGroup}
                          className="bg-destructive text-destructive-foreground"
                        >
                          نعم، احذف
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Members Tab */}
          <TabsContent value="members" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">الأعضاء ({initialMembers.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-auto">
                  {initialMembers.map((member) => (
                    <div key={member.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-secondary">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={member.profile?.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary/20 text-primary">
                          {member.profile?.display_name?.charAt(0) || "؟"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {member.profile?.display_name || "مستخدم"}
                          {member.user_id === currentUserId && <span className="text-xs text-primary mr-2">(أنت)</span>}
                        </p>
                        <p className="text-xs text-muted-foreground">{member.role === "admin" ? "مسؤول" : "عضو"}</p>
                      </div>
                      {isAdmin && member.user_id !== currentUserId && (
                        <div className="flex gap-1">
                          {member.role === "admin" ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleDemoteFromAdmin(member.id)}
                              title="تنزيل من مسؤول"
                            >
                              <Shield className="h-4 w-4 text-orange-500" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handlePromoteToAdmin(member.id)}
                              title="ترقية لمسؤول"
                            >
                              <Shield className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => handleRemoveMember(member.id, member.user_id)}
                            disabled={removingMember === member.id}
                          >
                            {removingMember === member.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <UserMinus className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Cells Tab */}
          {isAdmin && (
            <TabsContent value="cells" className="mt-4">
              <CellManagementPanel
                group={group}
                members={initialMembers}
                currentUserId={currentUserId}
                isAdmin={isAdmin}
              />
            </TabsContent>
          )}

          {/* Permissions Tab */}
          <TabsContent value="permissions" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">التحكم في الطبقات</CardTitle>
                <CardDescription>من يمكنه إرسال رسائل في الطبقة العلوية</CardDescription>
              </CardHeader>
              <CardContent>
                <RadioGroup
                  value={settings.upper_layer_permission}
                  onValueChange={(value) =>
                    setSettings({ ...settings, upper_layer_permission: value as UpperLayerPermission })
                  }
                  disabled={!isAdmin}
                >
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <RadioGroupItem value="all" id="all" />
                    <Label htmlFor="all">الجميع</Label>
                  </div>
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <RadioGroupItem value="admin_only" id="admin_only" />
                    <Label htmlFor="admin_only">المسؤولون فقط</Label>
                  </div>
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <RadioGroupItem value="selected_members" id="selected_members" />
                    <Label htmlFor="selected_members">أعضاء محددون</Label>
                  </div>
                </RadioGroup>
                {isAdmin && (
                  <Button onClick={handleSave} className="mt-4" disabled={isSaving}>
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <Save className="h-4 w-4 ml-2" />}
                    حفظ
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">ميزات الخلية</CardTitle>
                <CardDescription>تفعيل أو تعطيل ميزات الخلية</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">المفكرة التعاونية</p>
                    <p className="text-sm text-muted-foreground">السماح بتدوين الملاحظات المشتركة</p>
                  </div>
                  <Switch
                    checked={settings.allow_notebook}
                    onCheckedChange={(checked) => setSettings({ ...settings, allow_notebook: checked })}
                    disabled={!isAdmin}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">الخريطة الذهنية</p>
                    <p className="text-sm text-muted-foreground">عرض المحادثات في شكل شجري</p>
                  </div>
                  <Switch
                    checked={settings.allow_mindmap}
                    onCheckedChange={(checked) => setSettings({ ...settings, allow_mindmap: checked })}
                    disabled={!isAdmin}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">التلخيص الذكي</p>
                    <p className="text-sm text-muted-foreground">استخدام الذكاء الاصطناعي للتلخيص</p>
                  </div>
                  <Switch
                    checked={settings.allow_smart_summary}
                    onCheckedChange={(checked) => setSettings({ ...settings, allow_smart_summary: checked })}
                    disabled={!isAdmin}
                  />
                </div>
                {isAdmin && (
                  <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <Save className="h-4 w-4 ml-2" />}
                    حفظ
                  </Button>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Stats Tab */}
          <TabsContent value="stats" className="space-y-4 mt-4">
            {isLoadingStats ? (
              <div className="flex items-center justify-center p-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : statistics ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold">{statistics.totalMessages}</div>
                      <p className="text-xs text-muted-foreground">إجمالي الرسائل</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold text-amber-500">{statistics.upperMessages}</div>
                      <p className="text-xs text-muted-foreground">الطبقة العلوية</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold text-blue-500">{statistics.standardMessages}</div>
                      <p className="text-xs text-muted-foreground">الطبقة العادية</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold text-gray-500">{statistics.shadowMessages}</div>
                      <p className="text-xs text-muted-foreground">الطبقة الخفية</p>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">نشاط الأعضاء</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {statistics.memberStats.slice(0, 10).map((member, index) => (
                        <div key={member.userId} className="flex items-center gap-3">
                          <span className="text-sm text-muted-foreground w-6">{index + 1}.</span>
                          <div className="flex-1">
                            <p className="text-sm font-medium">{member.displayName}</p>
                          </div>
                          <span className="text-sm font-medium">{member.messageCount} رسالة</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {statistics.lastActivity && (
                  <Card>
                    <CardContent className="pt-6">
                      <p className="text-sm text-muted-foreground">آخر نشاط</p>
                      <p className="font-medium">{new Date(statistics.lastActivity).toLocaleString("ar-EG")}</p>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <div className="text-center p-12 text-muted-foreground">اضغط على تبويب الإحصائيات لتحميل البيانات</div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
