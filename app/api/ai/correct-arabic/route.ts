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

    const { text } = await request.json()

    const { text: correctedText } = await generateText({
      model: getAIModel(),
      prompt: `أنت مصحح لغوي للغة العربية. قم بتصحيح الأخطاء النحوية والإملائية في النص التالي، واحتفظ بالمعنى والأسلوب. إذا كان النص صحيحاً، أرجعه كما هو.

النص: "${text}"

أرجع النص المصحح فقط بدون أي تفسيرات أو إضافات.`,
    })

    return NextResponse.json({ corrected: correctedText.trim() })
  } catch (error) {
    console.error("Arabic correction error:", error)
    return NextResponse.json({ error: "Failed to correct text" }, { status: 500 })
  }
}
