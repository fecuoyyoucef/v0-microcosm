import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

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

    const chatbaseApiUrl = `${process.env.NEXT_PUBLIC_CHATBASE_HOST || "https://www.chatbase.co"}/api/v1/chat`

    const chatbaseResponse = await fetch(chatbaseApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chatbotId: process.env.NEXT_PUBLIC_CHATBOT_ID,
        messages: [
          ...history.map((msg: any) => ({
            role: msg.role,
            content: msg.content,
          })),
          {
            role: "user",
            content: message,
          },
        ],
        stream: false,
      }),
    })

    if (!chatbaseResponse.ok) {
      const errorText = await chatbaseResponse.text()
      console.error("[v0] Chatbase API error:", chatbaseResponse.status, errorText)
      throw new Error(`Chatbase API error: ${chatbaseResponse.status}`)
    }

    const chatbaseData = await chatbaseResponse.json()
    const text =
      chatbaseData.message?.content || chatbaseData.text || chatbaseData.response || "Sorry, I couldn't process that."

    let savedConversationId = conversationId

    if (!savedConversationId) {
      const { data, error } = await supabase
        .from("support_conversations")
        .insert({
          user_id: user.id,
          conversation_data: [...history, { role: "user", content: message }, { role: "assistant", content: text }],
        })
        .select("id")
        .single()

      if (error) {
        console.error("Error creating conversation:", error)
      } else {
        savedConversationId = data?.id
      }
    } else {
      const { error } = await supabase
        .from("support_conversations")
        .update({
          conversation_data: [...history, { role: "user", content: message }, { role: "assistant", content: text }],
          updated_at: new Date().toISOString(),
        })
        .eq("id", conversationId)

      if (error) {
        console.error("Error updating conversation:", error)
      }
    }

    const issueKeywords = ["خطأ", "مشكلة", "لا يعمل", "عطل", "bug", "error", "broken"]
    const issueDetected = issueKeywords.some((keyword) => message.toLowerCase().includes(keyword))

    if (issueDetected && savedConversationId) {
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
    console.error("[v0] Support chat error:", error)
    return NextResponse.json({ error: "Failed to process message" }, { status: 500 })
  }
}
