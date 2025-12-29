import { createServiceClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// This endpoint can be called by a cron job to update responsibility scores
export async function GET() {
  try {
    const supabase = createServiceClient()

    // Call the database function to update all scores
    const { error } = await supabase.rpc("update_all_responsibility_scores")

    if (error) {
      console.error("Error updating responsibility scores:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: "Responsibility scores updated" })
  } catch (error) {
    console.error("Error in cron job:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST() {
  return GET()
}
