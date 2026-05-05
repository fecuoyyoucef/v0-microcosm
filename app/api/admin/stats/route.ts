import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { verifyAdmin } from "@/lib/admin-auth"

export async function GET() {
  const admin = await verifyAdmin()
  if (!admin) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 })
  }

  try {
    const supabase = await createClient()

    // جلب الإحصائيات
    const [
      { count: usersCount },
      { count: groupsCount },
      { count: messagesCount },
      { count: decisionsCount },
      { data: messagesByLayer },
      { data: recentUsers },
      { data: recentGroups },
      { data: recentMessages },
    ] = await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("groups").select("*", { count: "exact", head: true }),
      supabase.from("messages").select("*", { count: "exact", head: true }),
      supabase.from("decisions").select("*", { count: "exact", head: true }),
      supabase.from("messages").select("layer"),
      supabase
        .from("profiles")
        .select("id, display_name, avatar_url, created_at")
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("groups")
        .select("id, name, avatar_url, created_at")
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("messages")
        .select("id, content, layer, created_at, sender_id, group_id")
        .order("created_at", { ascending: false })
        .limit(10),
    ])

    // حساب الرسائل حسب الطبقة
    const layerStats = {
      social: 0,
      coordination: 0,
      knowledge: 0,
    }

    if (messagesByLayer) {
      messagesByLayer.forEach((msg) => {
        if (msg.layer && layerStats[msg.layer as keyof typeof layerStats] !== undefined) {
          layerStats[msg.layer as keyof typeof layerStats]++
        }
      })
    }

    return NextResponse.json({
      stats: {
        users: usersCount || 0,
        groups: groupsCount || 0,
        messages: messagesCount || 0,
        decisions: decisionsCount || 0,
        messagesByLayer: layerStats,
      },
      recent: {
        users: recentUsers || [],
        groups: recentGroups || [],
        messages: recentMessages || [],
      },
      adminEmail: admin.email || "",
    })
  } catch (error) {
    console.error("Stats error:", error)
    return NextResponse.json({ error: "فشل جلب الإحصائيات" }, { status: 500 })
  }
}
