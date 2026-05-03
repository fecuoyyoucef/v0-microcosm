import { type NextRequest, NextResponse } from "next/server"
import { getSecurityAdvisories, getCodeScanningAlerts, updateCodeScanningAlert } from "@/lib/ai-agents/github-agent"
import { createServiceClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: admin } = await supabase.from("admins").select("role").eq("user_id", user.id).single()

    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const [advisories, scanningAlerts] = await Promise.all([getSecurityAdvisories(), getCodeScanningAlerts()])

    return NextResponse.json({
      securityAdvisories: advisories,
      codeScanningAlerts: scanningAlerts,
    })
  } catch (error) {
    console.error("Error fetching security data:", error)
    return NextResponse.json({ error: "Failed to fetch security data" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: admin } = await supabase.from("admins").select("role").eq("user_id", user.id).single()

    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { alertNumber, state, dismissedReason } = await request.json()

    const result = await updateCodeScanningAlert(alertNumber, state, dismissedReason)
    return NextResponse.json({ alert: result })
  } catch (error) {
    console.error("Error updating security alert:", error)
    return NextResponse.json({ error: "Failed to update alert" }, { status: 500 })
  }
}
