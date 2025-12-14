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

    const { messages } = await request.json()

    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: "No messages provided" }, { status: 400 })
    }

    const messagesText = messages.map((m: any) => m.content).join("\n")

    const { text } = await generateText({
      model: getAIModel(),
      prompt: `بناءً على الرسائل التالية، اقترح عنواناً قصيراً ومعبراً (3-6 كلمات) يلخص الموضوع الرئيسي:

${messagesText}

أرجع العنوان فقط بدون أي نص إضافي.`,
    })

    return NextResponse.json({ title: text.trim() })
  } catch (error) {
    console.error("Node title generation error:", error)
    return NextResponse.json({ error: "Failed to generate title" }, { status: 500 })
  }
}
