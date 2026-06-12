import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { generateAIText } from "@/lib/ai"
import { checkFeatureServer } from "@/lib/features-server"

export async function POST(request: NextRequest) {
  try {
    // Check if feature is enabled
    const enabled = await checkFeatureServer("ai_translation")
    if (!enabled) {
      return NextResponse.json({ error: "Feature disabled" }, { status: 403 })
    }

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

    const text = await generateAIText(
      `ترجم النص التالي إلى ${langNames[targetLang] || targetLang}:

"${content}"

أرجع الترجمة فقط بدون أي نص إضافي.`,
      { maxTokens: 800, temperature: 0.3 },
    )

    return NextResponse.json({ translation: text.trim() })
  } catch (error) {
    console.error("Translation error:", error)
    return NextResponse.json({ error: "Failed to translate" }, { status: 500 })
  }
}
