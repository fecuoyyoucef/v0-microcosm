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

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { message, conversationId, history } = await request.json()

    const systemPrompt = `أنت وكيل دعم ذكي لتطبيق Microcosm. هدفك مساعدة المستخدمين على فهم التطبيق وحل المشاكل.

التطبيق يحتوي على:
- الخلايا (Cells): مجموعات مصغرة لمواضيع محددة
- العقد (Nodes): تنظيم المحادثات داخل الخلايا
- القرارات الجماعية: التصويت على قرارات جماعية
- الألقاب والإنجازات: نظام نقاط وألقاب حسب النشاط
- المساعد الذكي: AI مساعد في المحادثات
- البحث الدلالي: بحث متقدم بالذكاء الاصطناعي

كن ودوداً ومفيداً. إذا اكتشفت مشكلة تقنية، اقترح على المستخدم الإبلاغ عنها رسمياً.
استخدم اللغة العربية الفصحى المبسطة.`

    const conversationContext = history
      .map((msg: any) => `${msg.role === "user" ? "المستخدم" : "الوكيل"}: ${msg.content}`)
      .join("\n")

    const { text } = await generateText({
      model: getAIModel(),
      prompt: `${systemPrompt}\n\nالمحادثة السابقة:\n${conversationContext}\n\nالمستخدم: ${message}\n\nالوكيل:`,
    })

    let savedConversationId = conversationId

    if (!savedConversationId) {
      const { data } = await supabase
        .from("support_conversations")
        .insert({
          user_id: user.id,
          conversation_data: [...history, { role: "user", content: message }, { role: "assistant", content: text }],
        })
        .select("id")
        .single()

      savedConversationId = data?.id
    } else {
      await supabase
        .from("support_conversations")
        .update({
          conversation_data: [...history, { role: "user", content: message }, { role: "assistant", content: text }],
          updated_at: new Date().toISOString(),
        })
        .eq("id", conversationId)
    }

    const issueKeywords = ["خطأ", "مشكلة", "لا يعمل", "عطل", "bug", "error", "broken"]
    const issueDetected = issueKeywords.some((keyword) => message.toLowerCase().includes(keyword))

    if (issueDetected) {
      await supabase
        .from("support_conversations")
        .update({
          issue_detected: message,
        })
        .eq("id", savedConversationId)
    }

    return NextResponse.json({
      response: text,
      conversationId: savedConversationId,
      issueDetected,
    })
  } catch (error) {
    console.error("Support chat error:", error)
    return NextResponse.json({ error: "Failed to process message" }, { status: 500 })
  }
}
