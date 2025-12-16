import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()

    const { error_id, owner_approved } = await request.json()

    // Get the error report
    const { data: errorReport } = await supabase.from("agent_error_reports").select("*").eq("id", error_id).single()

    if (!errorReport) {
      return NextResponse.json({ error: "Error report not found" }, { status: 404 })
    }

    // Check if owner approval is required
    if (!owner_approved) {
      return NextResponse.json({
        requires_approval: true,
        message: "Owner approval required before contacting v0",
        error_report: errorReport,
      })
    }

    // Mark as pending v0 response
    await supabase
      .from("agent_error_reports")
      .update({
        status: "pending_v0_response",
        v0_request_sent_at: new Date().toISOString(),
      })
      .eq("id", error_id)

    // Here you would integrate with v0's API
    // For now, we'll log it
    console.log("[v0] Fix request approved by owner:", {
      error_type: errorReport.error_type,
      message: errorReport.error_message,
      context: errorReport.context,
    })

    return NextResponse.json({
      success: true,
      message: "Request sent to v0 for analysis",
      error_id,
    })
  } catch (error: any) {
    console.error("[v0] Error requesting v0 fix:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
