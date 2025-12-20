import type { Metadata } from "next"
import { getActiveDocument } from "@/lib/supabase/legal-documents"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import ReactMarkdown from "react-markdown"

export const metadata: Metadata = {
  title: "شروط الاستخدام | Synaptic Space",
  description: "اطلع على شروط استخدام خدماتنا",
}

export default async function TermsOfServicePage() {
  const document = await getActiveDocument("terms_of_service")

  if (!document) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">لم يتم العثور على شروط الاستخدام</p>
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
