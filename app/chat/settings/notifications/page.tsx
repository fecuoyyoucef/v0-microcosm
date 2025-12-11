"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Bell, Volume2 } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function NotificationsSettingsPage() {
  const [enableNotifications, setEnableNotifications] = useState(true)
  const [enableSounds, setEnableSounds] = useState(true)
  const [enableDesktopNotifications, setEnableDesktopNotifications] = useState(false)
  const [notificationPreset, setNotificationPreset] = useState("all")

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Bell className="w-6 h-6 text-primary" />
          الإشعارات
        </h1>
        <p className="text-muted-foreground mt-1">إدارة إعدادات الإشعارات والصوتيات</p>
      </div>

      {/* General Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">الإشعارات العامة</CardTitle>
          <CardDescription>تحكم في متى تتلقى الإشعارات</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg hover:bg-secondary/30 transition">
            <div className="flex items-center gap-3 flex-1">
              <Bell className="w-5 h-5 text-muted-foreground" />
              <div>
                <Label className="font-semibold cursor-pointer">تفعيل الإشعارات</Label>
                <p className="text-xs text-muted-foreground">استقبل إشعارات عن الرسائل والأنشطة</p>
              </div>
            </div>
            <Switch checked={enableNotifications} onCheckedChange={setEnableNotifications} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notif-preset" className="font-semibold">
              نمط الإشعارات
            </Label>
            <Select value={notificationPreset} onValueChange={setNotificationPreset}>
              <SelectTrigger id="notif-preset">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الإشعارات</SelectItem>
                <SelectItem value="important">الإشعارات المهمة فقط</SelectItem>
                <SelectItem value="groups">تنبيهات المجموعات</SelectItem>
                <SelectItem value="mentions">الإشارات فقط</SelectItem>
                <SelectItem value="none">بدون إشعارات</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Sound and Desktop Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">الصوتيات والصور</CardTitle>
          <CardDescription>إعدادات إضافية للإشعارات</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg hover:bg-secondary/30 transition">
            <div className="flex items-center gap-3 flex-1">
              <Volume2 className="w-5 h-5 text-muted-foreground" />
              <div>
                <Label className="font-semibold cursor-pointer">أصوات الإشعارات</Label>
                <p className="text-xs text-muted-foreground">تشغيل صوت عند وصول رسالة جديدة</p>
              </div>
            </div>
            <Switch checked={enableSounds} onCheckedChange={setEnableSounds} />
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg hover:bg-secondary/30 transition">
            <div className="flex items-center gap-3 flex-1">
              <Bell className="w-5 h-5 text-muted-foreground" />
              <div>
                <Label className="font-semibold cursor-pointer">إشعارات سطح المكتب</Label>
                <p className="text-xs text-muted-foreground">إظهار إشعارات حتى عند عدم استخدام التطبيق</p>
              </div>
            </div>
            <Switch checked={enableDesktopNotifications} onCheckedChange={setEnableDesktopNotifications} />
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Per-Group Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">إشعارات محددة</CardTitle>
          <CardDescription>تخصيص الإشعارات لكل مجموعة</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            يمكنك تخصيص إعدادات الإشعارات لكل مجموعة على حدة من داخل المجموعة
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
