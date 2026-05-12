import { createServiceClient } from "@/lib/supabase/server"
import { generateAIText } from "@/lib/ai"
import { NextResponse } from "next/server"

// Cron job to automatically generate daily summaries for all groups
// Runs every 24 hours at midnight UTC
export async function GET(request: Request) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createServiceClient()
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const today = new Date().toISOString().split("T")[0]

    // Get all active groups that have messages in the last 24 hours
    const { data: groups, error: groupsError } = await supabase
      .from("groups")
      .select("id, name")

    if (groupsError) {
      console.error("[Cron] Error fetching groups:", groupsError)
      return NextResponse.json({ error: groupsError.message }, { status: 500 })
    }

    if (!groups || groups.length === 0) {
      return NextResponse.json({ success: true, message: "No groups found" })
    }

    const results: Array<{ groupId: string; status: string; messageCount?: number }> = []

    for (const group of groups) {
      try {
        // Check if summary already exists for today
        const { data: existingSummary } = await supabase
          .from("collective_memory")
          .select("id")
          .eq("group_id", group.id)
          .eq("summary_date", today)
          .single()

        if (existingSummary) {
          results.push({ groupId: group.id, status: "already_exists" })
          continue
        }

        // Fetch messages from the last 24 hours
        const { data: messages } = await supabase
          .from("messages")
          .select("content, sender_id, layer")
          .eq("group_id", group.id)
          .gte("created_at", yesterday)
          .order("created_at", { ascending: true })

        if (!messages || messages.length === 0) {
          results.push({ groupId: group.id, status: "no_messages" })
          continue
        }

        // Get sender names
        const senderIds = [...new Set(messages.map((m) => m.sender_id))]
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, display_name")
          .in("id", senderIds)

        const profileMap = new Map(profiles?.map((p) => [p.id, p.display_name]) || [])

        const messagesText = messages
          .map((m) => `[${profileMap.get(m.sender_id) || "مستخدم"}]: ${m.content}`)
          .join("\n")

        // Generate AI summary
        const text = await generateAIText(
          `لخص المحادثة التالية وأبرز النقاط المهمة والقرارات. أرجع الإجابة بصيغة JSON بالشكل التالي:
{
  "summary": "ملخص المحادثة",
  "highlights": ["نقطة 1", "نقطة 2"],
  "topics": ["موضوع 1", "موضوع 2"],
  "decisions": ["قرار 1"]
}

المحادثة:
${messagesText}`
        )

        let parsed = {
          summary: text,
          highlights: [] as string[],
          topics: [] as string[],
          decisions: [] as string[],
        }

        try {
          const jsonMatch = text.match(/\{[\s\S]*\}/)
          if (jsonMatch) {
            parsed = JSON.parse(jsonMatch[0])
          }
        } catch {
          console.log("[Cron] Could not parse JSON for group", group.id)
        }

        // Save the summary
        const { error: saveError } = await supabase
          .from("collective_memory")
          .upsert(
            {
              group_id: group.id,
              summary_date: today,
              summary: parsed.summary,
              highlights: parsed.highlights,
              topics: parsed.topics,
              decisions: parsed.decisions,
              message_count: messages.length,
              generated_at: new Date().toISOString(),
              auto_generated: true,
            },
            { onConflict: "group_id,summary_date" }
          )

        if (saveError) {
          console.error("[Cron] Save error for group", group.id, saveError)
          results.push({ groupId: group.id, status: "save_error" })
        } else {
          results.push({ groupId: group.id, status: "success", messageCount: messages.length })
        }
      } catch (groupError) {
        console.error("[Cron] Error processing group", group.id, groupError)
        results.push({ groupId: group.id, status: "error" })
      }
    }

    const successCount = results.filter((r) => r.status === "success").length
    console.log(`[Cron] Generated ${successCount} summaries out of ${groups.length} groups`)

    return NextResponse.json({
      success: true,
      message: `Generated ${successCount} summaries`,
      results,
    })
  } catch (error) {
    console.error("[Cron] Generate summaries error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  return GET(request)
}
