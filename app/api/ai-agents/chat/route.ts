import { createServiceClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"
import { createChiefAgent } from "@/lib/ai-agents/chief-agent"

export const runtime = "nodejs"
export const maxDuration = 60

// Singleton agent (one per server instance to preserve conversation history)
let agentInstance: ReturnType<typeof createChiefAgent> | null = null
function getAgent() {
  if (!agentInstance) {
    agentInstance = createChiefAgent()
  }
  return agentInstance
}

export async function POST(request: NextRequest) {
  try {
    // Use service client (no cookies needed - admin route)
    const supabase = createServiceClient()

    const { message, resetHistory } = await request.json()

    if (!message?.trim()) {
      return NextResponse.json({ error: "الرسالة مطلوبة" }, { status: 400 })
    }

    // Reset agent if requested (e.g. page refresh)
    if (resetHistory) {
      agentInstance = null
    }

    const agent = getAgent()
    const response = await agent.chat(message)

    // Save to DB (best effort, don't fail if it errors)
    try {
      await supabase.from("agent_chat_logs").insert([
        { message, sender: "owner", created_at: new Date().toISOString() },
        { message: response, sender: "agent", created_at: new Date().toISOString() },
      ])
    } catch {
      // DB save is optional
    }

    return NextResponse.json({ success: true, response })
  } catch (error: any) {
    console.error("[v0] Chief Agent chat error:", error.message)

    let response = "عذراً، حدث خطأ في الاتصال بالذكاء الاصطناعي."

    if (error.message?.includes("No Hugging Face tokens")) {
      response = "لم يتم إعداد مفاتيح HF_TOKEN. يرجى إضافة HF_TOKEN1 في إعدادات المشروع."
    } else if (error.message?.includes("rate limit") || error.message?.includes("429")) {
      response = "تم تجاوز حد الطلبات. يتم تدوير التوكن تلقائياً، يرجى المحاولة مجدداً."
    }

    return NextResponse.json({ success: false, response, error: error.message }, { status: 500 })
  }
}
