import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

async function verifyAdmin() {
  const cookieStore = await cookies()
  const token = cookieStore.get("admin_session")?.value
  if (!token) return null

  try {
    const decoded = JSON.parse(Buffer.from(token, "base64").toString())
    if (decoded.exp < Date.now()) return null
    return decoded
  } catch {
    return null
  }
}

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
        created_at,
        updated_at,
        conversation_data,
        profiles:user_id (display_name)
      `)
      .not("issue_detected", "is", null)
      .order("created_at", { ascending: false })
      .limit(50)

    console.log("[v0] Conversations:", conversations?.length, "Error:", convError)

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

    console.log("[v0] Reports:", reports?.length, "Error:", reportsError)

    const tickets = []

    if (!convError && conversations) {
      conversations.forEach((conv: any) => {
        tickets.push({
          id: `conv-${conv.id}`,
          user_id: conv.user_id,
          user_name: conv.profiles?.display_name || "مستخدم",
          type: "question",
          title: conv.issue_detected.substring(0, 100),
          description: conv.issue_detected,
          status: conv.escalated_to_admin ? "in_progress" : "open",
          priority: "normal",
          created_at: conv.created_at,
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

    console.log("[v0] Total tickets:", tickets.length)

    return NextResponse.json({ tickets })
  } catch (error) {
    console.error("[v0] Error fetching support tickets:", error)
    return NextResponse.json({ tickets: [], error: String(error) }, { status: 500 })
  }
}
