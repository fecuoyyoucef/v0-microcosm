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

    const { userId, groupId } = await request.json()

    // Get user and cell surveys
    const [{ data: userSurvey }, { data: cellSurvey }] = await Promise.all([
      supabase.from("user_surveys").select("*").eq("user_id", userId).single(),
      supabase.from("cell_surveys").select("*").eq("group_id", groupId).single(),
    ])

    if (!userSurvey || !cellSurvey) {
      return NextResponse.json({ error: "Survey data not found" }, { status: 404 })
    }

    // Use AI to analyze text responses
    const { text } = await generateText({
      model: getAIModel(),
      prompt: `قيّم مدى توافق المستخدم مع الخلية بناءً على المعلومات التالية:

معلومات المستخدم:
- الهدف: ${userSurvey.goal || "غير محدد"}
- المهارات: ${userSurvey.skills || "غير محدد"}
- أفضل محادثة: ${userSurvey.best_conversation || "غير محدد"}
- موضوع الخلية المثالي: ${userSurvey.dream_cell_topic || "غير محدد"}

معلومات الخلية:
- الهدف الأساسي: ${cellSurvey.primary_goal || "غير محدد"}
- وصف العضو المثالي: ${cellSurvey.ideal_member_description || "غير محدد"}

قيّم التوافق من 0 إلى 100، مع تفسير قصير (جملتين كحد أقصى) لماذا.

أرجع الإجابة بالصيغة:
الدرجة: [رقم]
التفسير: [النص]`,
    })

    const scoreMatch = text.match(/الدرجة:\s*(\d+)/)
    const explanationMatch = text.match(/التفسير:\s*(.+)/)

    const aiScore = scoreMatch ? Number.parseInt(scoreMatch[1]) : 50
    const explanation = explanationMatch ? explanationMatch[1].trim() : "تحليل غير متاح"

    return NextResponse.json({ aiScore, explanation })
  } catch (error) {
    console.error("AI matching enhancement error:", error)
    return NextResponse.json({ error: "Failed to enhance matching" }, { status: 500 })
  }
}
