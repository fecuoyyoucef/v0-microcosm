"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { MessageSquare, Trash2 } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function ChatsSettingsPage() {
  const [showTimestamps, setShowTimestamps] = useState(true)
  const [messagePreview, setMessagePreview] = useState("full")
  const [autoDelete, setAutoDelete] = useState("never")

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-primary" />
          إعدادات المحادثات
        </h1>
        <p className="text-muted-foreground mt-1">تخصيص كيفية عرض الرسائل والمحادثات</p>
      </div>

      {/* Display Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">عرض الرسائل</CardTitle>
          <CardDescription>تخصيص كيفية عرض الرسائل والمعلومات</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg hover:bg-secondary/30 transition">
            <div className="flex items-center gap-3 flex-1">
              <div>
                <Label className="font-semibold cursor-pointer">عرض الطوابع الزمنية</Label>
                <p className="text-xs text-muted-foreground">عرض وقت إرسال كل رسالة</p>
              </div>
            </div>
            <Switch checked={showTimestamps} onCheckedChange={setShowTimestamps} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="msg-preview" className="font-semibold">
              معاينة الرسالة
            </Label>
            <Select value={messagePreview} onValueChange={setMessagePreview}>
              <SelectTrigger id="msg-preview">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="full">النص الكامل</SelectItem>
                <SelectItem value="short">ملخص</SelectItem>
                <SelectItem value="none">بدون معاينة</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Privacy Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">خصوصية المحادثات</CardTitle>
          <CardDescription>إدارة بيانات المحادثات</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="auto-delete" className="font-semibold">
              حذف الرسائل تلقائياً
            </Label>
            <Select value={autoDelete} onValueChange={setAutoDelete}>
              <SelectTrigger id="auto-delete">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="never">أبداً</SelectItem>
                <SelectItem value="30">بعد 30 يوماً</SelectItem>
                <SelectItem value="90">بعد 90 يوماً</SelectItem>
                <SelectItem value="365">بعد سنة</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">الرسائل القديمة ستُحذف تلقائياً</p>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Danger Zone */}
      <Card className="border-destructive/20">
        <CardHeader>
          <CardTitle className="text-lg text-destructive flex items-center gap-2">
            <Trash2 className="w-5 h-5" />
            منطقة الخطر
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            className="border-destructive/50 text-destructive hover:bg-destructive/10 w-full bg-transparent"
          >
            حذف جميع المحادثات
          </Button>
          <p className="text-xs text-muted-foreground mt-2">هذا الإجراء سيحذف جميع محادثاتك بشكل نهائي</p>
        </CardContent>
      </Card>
    </div>
  )
}
