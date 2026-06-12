import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { generateAIText } from "@/lib/ai"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { content } = await request.json()

    const text = await generateAIText(
      `صنف الرسالة التالية إلى واحدة من هذه الفئات:
- question: سؤال أو استفسار
- decision: قرار أو اقتراح يحتاج تصويت
- idea: فكرة أو اقتراح إبداعي
- discussion: نقاش أو رأي
- task: مهمة أو إجراء مطلوب
- announcement: إعلان أو معلومة
- other: أخرى

الرسالة: "${content}"

أرجع فقط اسم الفئة بالإنجليزية (مثل: question, decision, etc.) بدون أي نص إضافي.`,
      { maxTokens: 20, temperature: 0.2 },
    )

    const category = text.trim().toLowerCase()

    // Extract tasks if message is a task
    let tasks: string[] = []
    if (category === "task" || content.includes("TODO") || content.includes("يجب") || content.includes("مطلوب")) {
      const tasksText = await generateAIText(
        `استخرج المهام القابلة للتنفيذ من النص التالي واعرضها كقائمة:

"${content}"

أرجع كل مهمة في سطر منفصل، ابدأ كل سطر بـ "-". إذا لم تجد مهام، أرجع "لا توجد مهام".`,
        { maxTokens: 300, temperature: 0.3 },
      )

      if (!tasksText.includes("لا توجد مهام")) {
        tasks = tasksText
          .split("\n")
          .filter((t) => t.trim().startsWith("-"))
          .map((t) => t.replace(/^-\s*/, "").trim())
      }
    }

    return NextResponse.json({ category, tasks })
  } catch (error) {
    console.error("Message classification error:", error)
    return NextResponse.json({ error: "Failed to classify message" }, { status: 500 })
  }
}
