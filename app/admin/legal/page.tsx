"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Save, FileText, Shield } from "lucide-react"

interface LegalDocument {
  id: string
  type: "privacy" | "terms"
  content: string
  version: number
  updated_at: string
}

export default function AdminLegalPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [privacyDoc, setPrivacyDoc] = useState<LegalDocument | null>(null)
  const [termsDoc, setTermsDoc] = useState<LegalDocument | null>(null)
  const [privacyContent, setPrivacyContent] = useState("")
  const [termsContent, setTermsContent] = useState("")
  const { toast } = useToast()

  useEffect(() => {
    loadDocuments()
  }, [])

  const loadDocuments = async () => {
    try {
      const response = await fetch("/api/legal/documents")
      if (!response.ok) throw new Error("فشل تحميل المستندات")

      const data = await response.json()

      const privacy = data.documents.find((d: LegalDocument) => d.type === "privacy")
      const terms = data.documents.find((d: LegalDocument) => d.type === "terms")

      setPrivacyDoc(privacy || null)
      setTermsDoc(terms || null)
      setPrivacyContent(privacy?.content || "")
      setTermsContent(terms?.content || "")
    } catch (error) {
      console.error("خطأ في تحميل المستندات:", error)
      toast({
        title: "خطأ",
        description: "فشل تحميل المستندات القانونية",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const saveDocument = async (type: "privacy" | "terms") => {
    setSaving(true)
    try {
      const content = type === "privacy" ? privacyContent : termsContent

      const response = await fetch("/api/admin/legal/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, content }),
      })

      if (!response.ok) throw new Error("فشل حفظ المستند")

      toast({
        title: "تم الحفظ",
        description: `تم حفظ ${type === "privacy" ? "سياسة الخصوصية" : "شروط الاستخدام"} بنجاح`,
      })

      await loadDocuments()
    } catch (error) {
      console.error("خطأ في حفظ المستند:", error)
      toast({
        title: "خطأ",
        description: "فشل حفظ المستند",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">إدارة المستندات القانونية</h1>
        <p className="text-muted-foreground">قم بتحرير سياسة الخصوصية وشروط الاستخدام للتطبيق</p>
      </div>

      <Tabs defaultValue="privacy" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="privacy" className="gap-2">
            <Shield className="h-4 w-4" />
            سياسة الخصوصية
          </TabsTrigger>
          <TabsTrigger value="terms" className="gap-2">
            <FileText className="h-4 w-4" />
            شروط الاستخدام
          </TabsTrigger>
        </TabsList>

        <TabsContent value="privacy">
          <Card className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold">سياسة الخصوصية</h2>
                  {privacyDoc && (
                    <p className="text-sm text-muted-foreground">
                      الإصدار {privacyDoc.version} - آخر تحديث:{" "}
                      {new Date(privacyDoc.updated_at).toLocaleDateString("ar")}
                    </p>
                  )}
                </div>
                <Button onClick={() => saveDocument("privacy")} disabled={saving} className="gap-2">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  حفظ التغييرات
                </Button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="privacy-content">المحتوى</Label>
                <Textarea
                  id="privacy-content"
                  value={privacyContent}
                  onChange={(e) => setPrivacyContent(e.target.value)}
                  placeholder="اكتب سياسة الخصوصية هنا..."
                  className="min-h-[500px] font-mono text-sm"
                  dir="rtl"
                />
                <p className="text-xs text-muted-foreground">يمكنك استخدام Markdown لتنسيق النص</p>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="terms">
          <Card className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold">شروط الاستخدام</h2>
                  {termsDoc && (
                    <p className="text-sm text-muted-foreground">
                      الإصدار {termsDoc.version} - آخر تحديث: {new Date(termsDoc.updated_at).toLocaleDateString("ar")}
                    </p>
                  )}
                </div>
                <Button onClick={() => saveDocument("terms")} disabled={saving} className="gap-2">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  حفظ التغييرات
                </Button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="terms-content">المحتوى</Label>
                <Textarea
                  id="terms-content"
                  value={termsContent}
                  onChange={(e) => setTermsContent(e.target.value)}
                  placeholder="اكتب شروط الاستخدام هنا..."
                  className="min-h-[500px] font-mono text-sm"
                  dir="rtl"
                />
                <p className="text-xs text-muted-foreground">يمكنك استخدام Markdown لتنسيق النص</p>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
