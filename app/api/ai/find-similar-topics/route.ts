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

    const { title, groupId } = await request.json()

    // Get existing nodes in the group
    const { data: existingNodes } = await supabase
      .from("conversation_nodes")
      .select("id, title, messages(count)")
      .eq("group_id", groupId)
      .neq("title", title)

    if (!existingNodes || existingNodes.length === 0) {
      return NextResponse.json({ similar: [] })
    }

    const nodesList = existingNodes.map((n) => `- ${n.title}`).join("\n")

    const { text } = await generateText({
      model: getAIModel(),
      prompt: `لديك موضوع جديد بعنوان: "${title}"

والمواضيع الموجودة:
${nodesList}

هل يوجد مواضيع مشابهة أو متداخلة؟ 
- إذا وجدت تشابه، أرجع أسماء المواضيع المشابهة مفصولة بفواصل
- إذا لم تجد تشابه، أرجع فقط كلمة "لا"

أرجع الإجابة فقط بدون أي نص إضافي.`,
    })

    if (text.trim() === "لا" || text.includes("لا توجد") || text.includes("لا يوجد")) {
      return NextResponse.json({ similar: [] })
    }

    const similarTitles = text.split(",").map((t) => t.trim())
    const similar = existingNodes.filter((n) =>
      similarTitles.some((st) => n.title.includes(st) || st.includes(n.title)),
    )

    return NextResponse.json({
      similar: similar.map((n) => ({
        id: n.id,
        title: n.title,
        messageCount: (n.messages as any)?.[0]?.count || 0,
      })),
    })
  } catch (error) {
    console.error("Similar topics error:", error)
    return NextResponse.json({ error: "Failed to find similar topics" }, { status: 500 })
  }
}
