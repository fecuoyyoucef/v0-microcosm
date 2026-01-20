import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"
import { createChiefAgent } from "@/lib/ai-agents/chief-agent"

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] Chat API called")

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      console.log("[v0] No user found")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[v0] User authenticated:", user.id)

    const { message, conversationId } = await request.json()

    if (!message?.trim()) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 })
    }

    console.log("[v0] Message received (Kimi-K2):", message)

    // Create Chief Agent with Kimi-K2
    const agent = createChiefAgent(conversationId)

    console.log("[v0] Calling Kimi-K2 agent...")
    const response = await agent.chat(message)
    console.log("[v0] Kimi-K2 responded successfully")

    console.log("[v0] Saving chat to database...")
    const { error: saveError } = await supabase.from("agent_chat_logs").insert([
      {
        user_id: user.id,
        message: message,
        sender: "owner",
      },
      {
        user_id: user.id,
        message: response,
        sender: "agent",
      },
    ])

    if (saveError) {
      console.error("[v0] Error saving chat:", saveError)
    } else {
      console.log("[v0] Chat saved successfully")
    }

    return NextResponse.json({ success: true, response })
  } catch (error: any) {
    console.error("[v0] Chief Agent chat error:", error)
    console.error("[v0] Error stack:", error.stack)

    let errorMessage = "عذراً، حدث خطأ غير متوقع. يرجى المحاولة لاحقاً."

    if (error.message?.includes("API key")) {
      errorMessage = "عذراً، مفتاح API الخاص بـ Groq غير مُعرّف. يرجى إضافته في إعدادات المشروع."
    } else if (error.message?.includes("حدث خطأ في خدمة الذكاء الاصطناعي")) {
      errorMessage = "عذراً، خدمة الذكاء الاصطناعي غير متاحة حالياً. يرجى المحاولة لاحقاً."
    }

    return NextResponse.json(
      {
        success: false,
        response: errorMessage,
        error: error.message,
      },
      { status: 500 },
    )
  }
}
