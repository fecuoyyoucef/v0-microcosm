import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { verifyAdmin } from "@/lib/admin-auth"

export async function GET() {
  const admin = await verifyAdmin()
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const supabase = await createClient()

    console.log("[v0] Fetching support tickets...")

    const { data: conversations, error: convError } = await supabase
      .from("support_conversations")
      .select(`
        id,
        user_id,
        issue_detected,
        escalated_to_admin,
        admin_reviewed,
        created_at,
        updated_at,
        conversation_data,
        profiles:user_id (display_name)
      `)
      .order("created_at", { ascending: false })
      .limit(100)

    console.log("[v0] Conversations fetched:", conversations?.length, "Error:", convError)

    const { data: reports, error: reportsError } = await supabase
      .from("user_issue_reports")
      .select(`
        id,
        user_id,
        title,
        description,
        issue_type,
        severity,
        status,
        created_at,
        profiles:user_id (display_name)
      `)
      .order("created_at", { ascending: false })
      .limit(50)

    console.log("[v0] Reports fetched:", reports?.length, "Error:", reportsError)

    const tickets = []

    if (!convError && conversations) {
      conversations.forEach((conv: any) => {
        // Skip inquiry-only conversations (no escalation and no detected issue).
        // These are pure Q&A and shouldn't pollute the bug ticket queue.
        // Report-mode conversations create a structured row in user_issue_reports
        // which is included separately below — so we only surface a conversation
        // here if it carries an issue signal but wasn't successfully escalated.
        if (!conv.escalated_to_admin && !conv.issue_detected) {
          return
        }
        // استخراج أول رسالة من المستخدم كعنوان
        let title = "محادثة دعم"
        let description = ""

        if (conv.conversation_data && Array.isArray(conv.conversation_data)) {
          const userMessages = conv.conversation_data.filter((m: any) => m.role === "user")
          if (userMessages.length > 0) {
            title = userMessages[0].content.substring(0, 100)
            description = userMessages.map((m: any) => m.content).join(" | ")
          }
        }

        // تحديد نوع التذكرة بناءً على المحتوى
        let type: "bug" | "feature" | "question" | "feedback" = "question"
        const contentLower = (title + description).toLowerCase()
        if (
          contentLower.includes("خطأ") ||
          contentLower.includes("مشكلة") ||
          contentLower.includes("لا يعمل") ||
          contentLower.includes("عطل")
        ) {
          type = "bug"
        } else if (contentLower.includes("اقتراح") || contentLower.includes("أضف") || contentLower.includes("ميزة")) {
          type = "feature"
        } else if (contentLower.includes("رأي") || contentLower.includes("تقييم")) {
          type = "feedback"
        }

        // تحديد الحالة
        let status: "open" | "in_progress" | "resolved" = "open"
        if (conv.admin_reviewed) {
          status = "resolved"
        } else if (conv.escalated_to_admin) {
          status = "in_progress"
        }

        // تحديد الأولوية بناءً على issue_detected
        let priority: "low" | "normal" | "high" = "normal"
        if (conv.issue_detected) {
          priority = "high"
        }

        tickets.push({
          id: `conv-${conv.id}`,
          user_id: conv.user_id,
          user_name: conv.profiles?.display_name || "مستخدم",
          type,
          title: conv.issue_detected || title,
          description: description || conv.issue_detected || "",
          status,
          priority,
          created_at: conv.created_at,
          conversation_data: conv.conversation_data,
        })
      })
    }

    if (!reportsError && reports) {
      reports.forEach((report: any) => {
        tickets.push({
          id: `report-${report.id}`,
          user_id: report.user_id,
          user_name: report.profiles?.display_name || "مستخدم",
          type: report.issue_type === "bug" ? "bug" : report.issue_type === "feature_request" ? "feature" : "feedback",
          title: report.title,
          description: report.description,
          status: report.status || "open",
          priority: report.severity || "normal",
          created_at: report.created_at,
        })
      })
    }

    tickets.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    console.log("[v0] Total tickets returned:", tickets.length)

    return NextResponse.json({ tickets })
  } catch (error) {
    console.error("[v0] Error fetching support tickets:", error)
    return NextResponse.json({ tickets: [], error: String(error) }, { status: 500 })
  }
}
