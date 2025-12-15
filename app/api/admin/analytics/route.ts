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

export async function GET(request: Request) {
  const admin = await verifyAdmin()
  if (!admin) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const range = searchParams.get("range") || "7d"

  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  try {
    const supabase = await createClient()

    // Daily messages
    const { data: messages } = await supabase
      .from("messages")
      .select("created_at, layer")
      .gte("created_at", startDate.toISOString())

    // Daily users
    const { data: users } = await supabase
      .from("profiles")
      .select("created_at")
      .gte("created_at", startDate.toISOString())

    // Top cells
    const { data: cellMessages } = await supabase
      .from("messages")
      .select("group_id, groups(name)")
      .gte("created_at", startDate.toISOString())

    // Top users
    const { data: userMessages } = await supabase
      .from("messages")
      .select("sender_id, profiles(display_name)")
      .gte("created_at", startDate.toISOString())

    // Process daily messages
    const dailyMessages: Record<string, number> = {}
    const layerDistribution = { social: 0, coordination: 0, knowledge: 0 }
    const peakHours: Record<number, number> = {}

    messages?.forEach((msg) => {
      const date = msg.created_at.split("T")[0]
      dailyMessages[date] = (dailyMessages[date] || 0) + 1

      if (msg.layer && layerDistribution[msg.layer as keyof typeof layerDistribution] !== undefined) {
        layerDistribution[msg.layer as keyof typeof layerDistribution]++
      }

      const hour = new Date(msg.created_at).getHours()
      peakHours[hour] = (peakHours[hour] || 0) + 1
    })

    // Process daily users
    const dailyUsers: Record<string, number> = {}
    users?.forEach((user) => {
      const date = user.created_at.split("T")[0]
      dailyUsers[date] = (dailyUsers[date] || 0) + 1
    })

    // Process top cells
    const cellCounts: Record<string, { name: string; count: number }> = {}
    cellMessages?.forEach((msg: any) => {
      if (msg.group_id && msg.groups?.name) {
        if (!cellCounts[msg.group_id]) {
          cellCounts[msg.group_id] = { name: msg.groups.name, count: 0 }
        }
        cellCounts[msg.group_id].count++
      }
    })

    // Process top users
    const userCounts: Record<string, { name: string; count: number }> = {}
    userMessages?.forEach((msg: any) => {
      if (msg.sender_id && msg.profiles?.display_name) {
        if (!userCounts[msg.sender_id]) {
          userCounts[msg.sender_id] = { name: msg.profiles.display_name, count: 0 }
        }
        userCounts[msg.sender_id].count++
      }
    })

    // Format for response
    const allDates = []
    for (let i = 0; i < days; i++) {
      const d = new Date()
      d.setDate(d.getDate() - (days - 1 - i))
      allDates.push(d.toISOString().split("T")[0])
    }

    return NextResponse.json({
      dailyMessages: allDates.map((date) => ({ date, count: dailyMessages[date] || 0 })),
      dailyUsers: allDates.map((date) => ({ date, count: dailyUsers[date] || 0 })),
      topCells: Object.entries(cellCounts)
        .map(([id, data]) => ({ id, name: data.name, messages: data.count }))
        .sort((a, b) => b.messages - a.messages)
        .slice(0, 10),
      topUsers: Object.entries(userCounts)
        .map(([id, data]) => ({ id, name: data.name, messages: data.count }))
        .sort((a, b) => b.messages - a.messages)
        .slice(0, 10),
      peakHours: Object.entries(peakHours).map(([hour, count]) => ({ hour: Number.parseInt(hour), count })),
      layerDistribution,
    })
  } catch (error) {
    console.error("Analytics error:", error)
    return NextResponse.json({ error: "فشل جلب التحليلات" }, { status: 500 })
  }
}
