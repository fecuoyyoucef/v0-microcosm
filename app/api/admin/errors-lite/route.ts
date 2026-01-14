import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"

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

export async function GET(request: NextRequest) {
  try {
    const admin = await verifyAdmin()
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const limit = Math.min(Number.parseInt(searchParams.get("limit") || "20"), 50)
    const hours = Number.parseInt(searchParams.get("hours") || "1")

    const oneHourAgo = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()

    const supabase = await createClient()

    const { data: events, error } = await supabase
      .from("monitoring_events")
      .select("id, event_type, event_data, user_id, created_at")
      .eq("event_type", "error")
      .gte("created_at", oneHourAgo)
      .order("created_at", { ascending: false })
      .limit(limit)

    if (error) throw error

    const errorGroups = new Map<string, any>()

    events?.forEach((event: any) => {
      const message = event.event_data?.message || event.event_data?.error || "Unknown Error"
      const key = message.substring(0, 80)

      if (errorGroups.has(key)) {
        const existing = errorGroups.get(key)
        existing.count++
        existing.lastSeen = event.created_at
      } else {
        errorGroups.set(key, {
          id: event.id,
          message,
          level: event.event_data?.level || "error",
          location: event.event_data?.location || "unknown",
          count: 1,
          firstSeen: event.created_at,
          lastSeen: event.created_at,
        })
      }
    })

    const issues = Array.from(errorGroups.values())
      .sort((a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime())
      .slice(0, limit)

    return NextResponse.json({
      issues,
      total: issues.length,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[v0] Errors lite API error:", error)
    return NextResponse.json({ issues: [], total: 0, error: "Failed to fetch errors" }, { status: 500 })
  }
}
