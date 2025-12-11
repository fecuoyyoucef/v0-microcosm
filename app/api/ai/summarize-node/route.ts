import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { generateAIText } from "@/lib/ai"

export async function POST(request: NextRequest) {
  try {
    const { nodeId, groupId } = await request.json()

    if (!nodeId || !groupId) {
      return NextResponse.json({ error: "Missing nodeId or groupId" }, { status: 400 })
    }

    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify membership
    const { data: membership } = await supabase
      .from("group_members")
      .select("id")
      .eq("group_id", groupId)
      .eq("user_id", user.id)
      .single()

    if (!membership) {
      return NextResponse.json({ error: "Not a member" }, { status: 403 })
    }

    // Get the primary node
    const { data: primaryNode } = await supabase.from("conversation_nodes").select("*").eq("id", nodeId).single()

    if (!primaryNode || primaryNode.parent_id) {
      return NextResponse.json({ error: "Node not found or not a primary node" }, { status: 404 })
    }

    // Get sub-nodes
    const { data: subNodes } = await supabase
      .from("conversation_nodes")
      .select("*")
      .eq("parent_id", nodeId)
      .order("sort_order")

    // Get all messages from primary node and its sub-nodes
    const nodeIds = [nodeId, ...(subNodes?.map((n) => n.id) || [])]

    const { data: messages } = await supabase
      .from("messages")
      .select(`
        id,
        content,
        layer,
        node_id,
        created_at,
        sender:profiles!sender_id(display_name)
      `)
      .in("node_id", nodeIds)
      .order("created_at", { ascending: true })
      .limit(200)

    if (!messages || messages.length === 0) {
      return NextResponse.json({
        summary: {
          id: crypto.randomUUID(),
          node_id: nodeId,
          group_id: groupId,
          summary: "لا توجد رسائل في هذه العقدة بعد.",
          key_points: [],
          decisions: [],
          questions: [],
          discussions: [],
          message_count: 0,
          sub_nodes_summary: [],
          generated_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        },
      })
    }

    // Organize messages by node for context
    const messagesByNode: Record<string, typeof messages> = {}
    messages.forEach((msg) => {
      const nid = msg.node_id || "direct"
      if (!messagesByNode[nid]) messagesByNode[nid] = []
      messagesByNode[nid].push(msg)
    })

    // Build context for AI
    let context = `العقدة الأساسية: ${primaryNode.title}\n`
    context += `الوصف: ${primaryNode.description || "لا يوجد وصف"}\n\n`

    // Messages in primary node
    if (messagesByNode[nodeId]) {
      context += `=== رسائل العقدة الأساسية (${messagesByNode[nodeId].length} رسالة) ===\n`
      messagesByNode[nodeId].forEach((msg) => {
        const sender = (msg.sender as { display_name?: string })?.display_name || "مجهول"
        context += `[${sender}]: ${msg.content}\n`
      })
      context += "\n"
    }

    // Messages in sub-nodes
    if (subNodes && subNodes.length > 0) {
      context += `=== العقد الفرعية ===\n`
      subNodes.forEach((subNode) => {
        const subMessages = messagesByNode[subNode.id] || []
        context += `\n--- ${subNode.title} (${subMessages.length} رسالة) ---\n`
        subMessages.forEach((msg) => {
          const sender = (msg.sender as { display_name?: string })?.display_name || "مجهول"
          context += `[${sender}]: ${msg.content}\n`
        })
      })
    }

    // Generate AI summary
    const prompt = `أنت مساعد ذكي لتلخيص المحادثات. قم بتحليل المحادثات التالية وإنشاء ملخص شامل.

${context}

قم بإنشاء ملخص يتضمن:
1. ملخص عام (2-3 جمل) يوضح الموضوع الرئيسي
2. النقاط الرئيسية التي تمت مناقشتها (3-5 نقاط)
3. القرارات التي تم اتخاذها (إن وجدت)
4. الأسئلة المطروحة (إن وجدت)
5. النقاشات الجوهرية (إن وجدت)
6. ملخص لكل عقدة فرعية (إن وجدت)

أجب بتنسيق JSON التالي:
{
  "summary": "الملخص العام",
  "key_points": ["نقطة 1", "نقطة 2"],
  "decisions": ["قرار 1"],
  "questions": ["سؤال 1"],
  "discussions": ["نقاش 1"],
  "sub_nodes_summary": [{"node_title": "اسم العقدة", "summary": "ملخص", "message_count": 5}]
}`

    const aiResponse = await generateAIText(prompt)

    // Parse AI response
    let parsedSummary
    try {
      // Extract JSON from response
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        parsedSummary = JSON.parse(jsonMatch[0])
      } else {
        parsedSummary = {
          summary: aiResponse,
          key_points: [],
          decisions: [],
          questions: [],
          discussions: [],
          sub_nodes_summary: [],
        }
      }
    } catch {
      parsedSummary = {
        summary: aiResponse,
        key_points: [],
        decisions: [],
        questions: [],
        discussions: [],
        sub_nodes_summary: [],
      }
    }

    // Save summary to database
    const summaryData = {
      node_id: nodeId,
      group_id: groupId,
      summary: parsedSummary.summary,
      key_points: parsedSummary.key_points || [],
      decisions: parsedSummary.decisions || [],
      questions: parsedSummary.questions || [],
      discussions: parsedSummary.discussions || [],
      message_count: messages.length,
      sub_nodes_summary: parsedSummary.sub_nodes_summary || [],
      generated_at: new Date().toISOString(),
    }

    const { data: savedSummary, error: saveError } = await supabase
      .from("node_summaries")
      .upsert(summaryData, { onConflict: "node_id" })
      .select()
      .single()

    if (saveError) {
      console.error("Error saving summary:", saveError)
    }

    return NextResponse.json({
      summary: savedSummary || { ...summaryData, id: crypto.randomUUID(), created_at: new Date().toISOString() },
    })
  } catch (error) {
    console.error("Error in summarize-node:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
