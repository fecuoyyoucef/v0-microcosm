import { createServiceClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// This endpoint can be called by a cron job to update responsibility scores
function isAuthorized(request: Request) {
  const configuredSecret = process.env.CRON_SECRET
  const authorization = request.headers.get("authorization")
  return Boolean(configuredSecret && authorization === `Bearer ${configuredSecret}`)
}

async function run(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

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

export async function GET(request: Request) {
  return run(request)
}

export async function POST(request: Request) {
  return run(request)
}
