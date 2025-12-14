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

    // Get user interests and behavior
    const { data: userSurvey } = await supabase.from("user_surveys").select("*").eq("user_id", user.id).single()

    const { data: userActivity } = await supabase
      .from("messages")
      .select("content, conversation_nodes(title)")
      .eq("sender_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20)

    // Get available nodes user hasn't interacted with
    const { data: allNodes } = await supabase
      .from("conversation_nodes")
      .select("id, title, messages(count)")
      .order("created_at", { ascending: false })
      .limit(50)

    const nodeTopics = allNodes?.map((n) => n.title).join(", ") || ""
    const userInterests = userSurvey?.interests?.join(", ") || "غير محدد"
    const recentTopics =
      userActivity
        ?.map((m: any) => m.conversation_nodes?.title)
        .filter(Boolean)
        .join(", ") || "غير متاح"

    const { text } = await generateText({
      model: getAIModel(),
      prompt: `أنت نظام توصيات ذكي. بناءً على المعلومات التالية، اقترح 3 مواضيع أو عقد نقاش قد تهم المستخدم:

اهتمامات المستخدم: ${userInterests}
المواضيع التي تفاعل معها مؤخراً: ${recentTopics}
المواضيع المتاحة: ${nodeTopics}

أرجع 3 اقتراحات، كل واحد في سطر مستقل بالصيغة:
- [عنوان الموضوع]: [سبب الاقتراح بجملة قصيرة]`,
    })

    const recommendations = text
      .split("\n")
      .filter((line) => line.trim().startsWith("-"))
      .map((line) => {
        const match = line.match(/^-\s*\[(.*?)\]:\s*(.*)/)
        if (match) {
          return { title: match[1].trim(), reason: match[2].trim() }
        }
        return null
      })
      .filter(Boolean)

    return NextResponse.json({ recommendations })
  } catch (error) {
    console.error("Content recommendation error:", error)
    return NextResponse.json({ error: "Failed to generate recommendations" }, { status: 500 })
  }
}
