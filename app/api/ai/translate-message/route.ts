import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getAIModel } from "@/lib/ai"
import { generateText } from "ai"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { content, targetLang } = await request.json()

    const langNames: Record<string, string> = {
      ar: "العربية",
      en: "الإنجليزية",
      fr: "الفرنسية",
    }

    const { text } = await generateText({
      model: getAIModel(),
      prompt: `ترجم النص التالي إلى ${langNames[targetLang] || targetLang}:

"${content}"

أرجع الترجمة فقط بدون أي نص إضافي.`,
    })

    return NextResponse.json({ translation: text.trim() })
  } catch (error) {
    console.error("Translation error:", error)
    return NextResponse.json({ error: "Failed to translate" }, { status: 500 })
  }
}
