import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getAIModel } from "@/lib/ai"
import { generateText } from "ai"

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] Support chat API called")

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      console.log("[v0] Unauthorized: No user found")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[v0] User authenticated:", user.id)

    const { message, conversationId, history } = await request.json()
    console.log("[v0] Message received:", message)
    console.log("[v0] Conversation ID:", conversationId)
    console.log("[v0] History length:", history?.length)

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

    console.log("[v0] Generating AI response...")

    const { text } = await generateText({
      model: getAIModel(),
      prompt: `${systemPrompt}\n\nالمحادثة السابقة:\n${conversationContext}\n\nالمستخدم: ${message}\n\nالوكيل:`,
    })

    console.log("[v0] AI response generated:", text.substring(0, 50) + "...")

    let savedConversationId = conversationId

    if (!savedConversationId) {
      console.log("[v0] Creating new conversation...")
      const { data, error } = await supabase
        .from("support_conversations")
        .insert({
          user_id: user.id,
          conversation_data: [...history, { role: "user", content: message }, { role: "assistant", content: text }],
        })
        .select("id")
        .single()

      if (error) {
        console.error("[v0] Error creating conversation:", error)
      } else {
        savedConversationId = data?.id
        console.log("[v0] New conversation created:", savedConversationId)
      }
    } else {
      console.log("[v0] Updating existing conversation:", savedConversationId)
      const { error } = await supabase
        .from("support_conversations")
        .update({
          conversation_data: [...history, { role: "user", content: message }, { role: "assistant", content: text }],
          updated_at: new Date().toISOString(),
        })
        .eq("id", conversationId)

      if (error) {
        console.error("[v0] Error updating conversation:", error)
      }
    }

    const issueKeywords = ["خطأ", "مشكلة", "لا يعمل", "عطل", "bug", "error", "broken"]
    const issueDetected = issueKeywords.some((keyword) => message.toLowerCase().includes(keyword))

    if (issueDetected) {
      console.log("[v0] Issue detected in message")
      await supabase
        .from("support_conversations")
        .update({
          issue_detected: message,
        })
        .eq("id", savedConversationId)
    }

    console.log("[v0] Sending response to client")
    return NextResponse.json({
      response: text,
      conversationId: savedConversationId,
      issueDetected,
    })
  } catch (error) {
    console.error("[v0] Support chat error:", error)
    return NextResponse.json({ error: "Failed to process message" }, { status: 500 })
  }
}
