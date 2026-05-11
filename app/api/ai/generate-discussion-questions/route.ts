import { createClient } from "@/lib/supabase/server"
import { generateAIText } from "@/lib/ai"
import { checkFeatureServer } from "@/lib/features-server"

export async function POST(req: Request) {
  try {
    // Check if feature is enabled
    const enabled = await checkFeatureServer("ai_discussion_questions")
    if (!enabled) {
      return Response.json({ error: "Feature disabled" }, { status: 403 })
    }

    const { groupId, nodeId, context } = await req.json()
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return Response.json({ error: "غير مصرح" }, { status: 401 })
    }

    // جلب آخر الرسائل للسياق
    let contextText = context || ""

    if (!contextText && nodeId) {
      const { data: messages } = await supabase
        .from("messages")
        .select("content")
        .eq("node_id", nodeId)
        .order("created_at", { ascending: false })
        .limit(10)

      contextText = messages?.map((m) => m.content).join("\n") || ""
    }

    const prompt = `بناءً على السياق التالي، اقترح 3-5 أسئلة نقاش عميقة ومحفزة للتفكير (أرجع قائمة JSON فقط):

السياق: ${contextText || "نقاش عام"}

أرجع: ["سؤال 1", "سؤال 2", ...]`

    const text = await generateAIText(prompt, { maxTokens: 500 })
    const jsonMatch = text.match(/\[[\s\S]*\]/)

    let questions: string[] = []
    if (jsonMatch) {
      questions = JSON.parse(jsonMatch[0])
    }

    return Response.json({ success: true, questions })
  } catch (error) {
    console.error("Generate questions error:", error)
    return Response.json({ error: "حدث خطأ" }, { status: 500 })
  }
}
