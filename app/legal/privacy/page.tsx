import type { Metadata } from "next"
import { getActiveDocument } from "@/lib/supabase/legal-documents"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import ReactMarkdown from "react-markdown"

export const metadata: Metadata = {
  title: "سياسة الخصوصية | Synaptic Space",
  description: "اطلع على سياسة الخصوصية الخاصة بنا",
}

export default async function PrivacyPolicyPage() {
  const document = await getActiveDocument("privacy_policy")

  if (!document) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">لم يتم العثور على سياسة الخصوصية</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-center">{document.title}</CardTitle>
          <div className="text-center text-sm text-muted-foreground">
            الإصدار {document.version} • آخر تحديث: {new Date(document.updated_at).toLocaleDateString("ar-SA")}
          </div>
        </CardHeader>
        <Separator />
        <CardContent className="py-6">
          <div className="prose prose-slate dark:prose-invert max-w-none text-right" dir="rtl">
            <ReactMarkdown>{document.content}</ReactMarkdown>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
