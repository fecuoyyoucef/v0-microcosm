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
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 })
  }

  try {
    const supabase = await createClient()

    // Fetch cells with creator info
    const { data: cells } = await supabase
      .from("groups")
      .select("*, profiles!groups_created_by_fkey(display_name)")
      .order("created_at", { ascending: false })

    // Fetch member counts
    const { data: memberCounts } = await supabase.from("group_members").select("group_id")

    // Fetch message counts
    const { data: messageCounts } = await supabase.from("messages").select("group_id")

    // Process counts
    const memberCountMap: Record<string, number> = {}
    memberCounts?.forEach((m) => {
      memberCountMap[m.group_id] = (memberCountMap[m.group_id] || 0) + 1
    })

    const messageCountMap: Record<string, number> = {}
    messageCounts?.forEach((m) => {
      messageCountMap[m.group_id] = (messageCountMap[m.group_id] || 0) + 1
    })

    const enrichedCells = cells?.map((cell: any) => ({
      id: cell.id,
      name: cell.name,
      description: cell.description,
      avatar_url: cell.avatar_url,
      created_at: cell.created_at,
      members_count: memberCountMap[cell.id] || 0,
      messages_count: messageCountMap[cell.id] || 0,
      created_by_name: cell.profiles?.display_name,
    }))

    return NextResponse.json({ cells: enrichedCells || [] })
  } catch (error) {
    console.error("Cells error:", error)
    return NextResponse.json({ error: "فشل جلب الخلايا" }, { status: 500 })
  }
}
