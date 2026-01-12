import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    // Get user's current groups
    const { data: userGroups } = await supabase.from("group_members").select("group_id").eq("user_id", user.id)

    const userGroupIds = userGroups?.map((g) => g.group_id) || []

    // Get recommended groups user is NOT in yet, sorted by member count
    const { data: recommendedGroups } = await supabase
      .from("groups")
      .select("id, name, description, group_members(count)")
      .not("id", "in", `(${userGroupIds.length > 0 ? userGroupIds.join(",") : "null"})`)
      .order("created_at", { ascending: false })
      .limit(5)

    const validRecommendations = (recommendedGroups || [])
      .filter((group) => {
        const memberCount = Array.isArray(group.group_members)
          ? group.group_members.length
          : group.group_members?.count || 0
        return group.name && group.id && memberCount > 0
      })
      .slice(0, 3)
      .map((group) => {
        const memberCount = Array.isArray(group.group_members)
          ? group.group_members.length
          : group.group_members?.count || 0

        return {
          type: "cell",
          id: group.id,
          title: group.name,
          description: group.description || "خلية متاحة للانضمام",
          score: Math.min(100, memberCount * 10), // Calculate score from member count
          reason: `${memberCount} أعضاء نشطين في هذه الخلية`,
        }
      })

    return NextResponse.json({
      recommendations: validRecommendations.length > 0 ? validRecommendations : [],
    })
  } catch (error) {
    console.error("Content recommendation error:", error)
    return NextResponse.json({ recommendations: [] })
  }
}
