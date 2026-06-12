import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { generateAIChat } from "@/lib/ai"
import { checkFeatureServer } from "@/lib/features-server"

export async function POST(request: NextRequest) {
  try {
    // Check if feature is enabled
    const enabled = await checkFeatureServer("ai_quality_assessment")
    if (!enabled) {
      return NextResponse.json({ error: "Feature disabled" }, { status: 403 })
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { groupId, nodeId } = await request.json()

    // Get messages from node or group
    let query = supabase
      .from("messages")
      .select("content, sender:profiles!sender_id(display_name)")
      .order("created_at", { ascending: false })
      .limit(50)

    if (nodeId) {
      query = query.eq("node_id", nodeId)
    } else {
      query = query.eq("group_id", groupId)
    }

    const { data: messages } = await query

    if (!messages || messages.length < 5) {
      return NextResponse.json(
        {
          error: "Not enough messages",
          quality: { score: 0, feedback: "عدد الرسائل غير كافٍ للتقييم" },
        },
        { status: 400 },
      )
    }

    const messagesText = messages.map((m: any) => `${m.sender?.display_name || "مستخدم"}: ${m.content}`).join("\n")

    const text = await generateAIChat({
      maxTokens: 400,
      temperature: 0.5,
      prompt: `قيّم جودة النقاش التالي من 0 إلى 100 بناءً على:
- التنوع في الآراء
- عمق المحتوى
- الاحترام المتبادل
- البناء على أفكار الآخرين
- وضوح التعبير

النقاش:
${messagesText}

أرجع الإجابة بالصيغة التالية:
الدرجة: [رقم من 0-100]
التقييم: [جملة أو جملتين تلخص نقاط القوة والضعف]`,
    })

    const scoreMatch = text.match(/الدرجة:\s*(\d+)/)
    const feedbackMatch = text.match(/التقييم:\s*(.+)/)

    const score = scoreMatch ? Number.parseInt(scoreMatch[1]) : 50
    const feedback = feedbackMatch ? feedbackMatch[1].trim() : "تقييم غير متاح"

    return NextResponse.json({
      quality: {
        score,
        feedback,
        level: score >= 80 ? "ممتاز" : score >= 60 ? "جيد" : score >= 40 ? "متوسط" : "ضعيف",
      },
    })
  } catch (error) {
    console.error("Discussion quality error:", error)
    return NextResponse.json({ error: "Failed to assess quality" }, { status: 500 })
  }
}
