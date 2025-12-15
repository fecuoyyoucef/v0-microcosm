"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Settings, Shield, Bell, Database, Save, Loader2 } from "lucide-react"
import { toast } from "react-toastify"

export default function AdminSettingsPage() {
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState({
    maintenance_mode: false,
    registration_enabled: true,
    require_email_verification: true,
    max_groups_per_user: 10,
    max_members_per_group: 100,
    ai_features_enabled: true,
    push_notifications_enabled: true,
    analytics_enabled: true,
  })

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      })

      if (res.ok) {
        toast.success("تم حفظ الإعدادات بنجاح")
      } else {
        toast.error("فشل حفظ الإعدادات")
      }
    } catch (error) {
      toast.error("حدث خطأ")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Settings className="w-6 h-6 text-slate-400" />
            إعدادات النظام
          </h1>
          <p className="text-slate-400">تكوين إعدادات التطبيق العامة</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="gap-2 bg-cyan-600 hover:bg-cyan-700">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          حفظ التغييرات
        </Button>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-slate-900/50">
          <TabsTrigger value="general" className="data-[state=active]:bg-slate-700 gap-2">
            <Settings className="w-4 h-4" />
            عام
          </TabsTrigger>
          <TabsTrigger value="security" className="data-[state=active]:bg-slate-700 gap-2">
            <Shield className="w-4 h-4" />
            الأمان
          </TabsTrigger>
          <TabsTrigger value="notifications" className="data-[state=active]:bg-slate-700 gap-2">
            <Bell className="w-4 h-4" />
            الإشعارات
          </TabsTrigger>
          <TabsTrigger value="limits" className="data-[state=active]:bg-slate-700 gap-2">
            <Database className="w-4 h-4" />
            الحدود
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-6 space-y-4">
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">الإعدادات العامة</CardTitle>
              <CardDescription>تحكم في الإعدادات الأساسية للتطبيق</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-white">وضع الصيانة</Label>
                  <p className="text-sm text-slate-400">تعطيل التطبيق مؤقتاً للصيانة</p>
                </div>
                <Switch
                  checked={settings.maintenance_mode}
                  onCheckedChange={(checked) => setSettings({ ...settings, maintenance_mode: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-white">التسجيل مفعل</Label>
                  <p className="text-sm text-slate-400">السماح للمستخدمين الجدد بالتسجيل</p>
                </div>
                <Switch
                  checked={settings.registration_enabled}
                  onCheckedChange={(checked) => setSettings({ ...settings, registration_enabled: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-white">ميزات الذكاء الاصطناعي</Label>
                  <p className="text-sm text-slate-400">تفعيل جميع ميزات AI</p>
                </div>
                <Switch
                  checked={settings.ai_features_enabled}
                  onCheckedChange={(checked) => setSettings({ ...settings, ai_features_enabled: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-white">التحليلات</Label>
                  <p className="text-sm text-slate-400">جمع بيانات الاستخدام</p>
                </div>
                <Switch
                  checked={settings.analytics_enabled}
                  onCheckedChange={(checked) => setSettings({ ...settings, analytics_enabled: checked })}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="mt-6 space-y-4">
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">إعدادات الأمان</CardTitle>
              <CardDescription>تكوين خيارات الأمان والمصادقة</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-white">تأكيد البريد الإلكتروني</Label>
                  <p className="text-sm text-slate-400">مطلوب للتسجيل الجديد</p>
                </div>
                <Switch
                  checked={settings.require_email_verification}
                  onCheckedChange={(checked) => setSettings({ ...settings, require_email_verification: checked })}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="mt-6 space-y-4">
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">إعدادات الإشعارات</CardTitle>
              <CardDescription>تكوين نظام الإشعارات</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-white">الإشعارات الفورية</Label>
                  <p className="text-sm text-slate-400">تفعيل Push Notifications</p>
                </div>
                <Switch
                  checked={settings.push_notifications_enabled}
                  onCheckedChange={(checked) => setSettings({ ...settings, push_notifications_enabled: checked })}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="limits" className="mt-6 space-y-4">
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">حدود النظام</CardTitle>
              <CardDescription>تحديد الحدود القصوى للموارد</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label className="text-white">الحد الأقصى للخلايا لكل مستخدم</Label>
                <Input
                  type="number"
                  value={settings.max_groups_per_user}
                  onChange={(e) => setSettings({ ...settings, max_groups_per_user: Number.parseInt(e.target.value) })}
                  className="bg-slate-800 border-slate-700 text-white w-32"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-white">الحد الأقصى للأعضاء في الخلية</Label>
                <Input
                  type="number"
                  value={settings.max_members_per_group}
                  onChange={(e) => setSettings({ ...settings, max_members_per_group: Number.parseInt(e.target.value) })}
                  className="bg-slate-800 border-slate-700 text-white w-32"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
