import { createClient } from "@/lib/supabase/server"
import { calculateCompatibilityScore } from "@/lib/synaptic-matching"

export async function POST(req: Request) {
  try {
    const { groupId, limit = 10 } = await req.json()
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return Response.json({ error: "غير مصرح" }, { status: 401 })
    }

    // التحقق من أن المستخدم مسؤول
    const { data: membership } = await supabase
      .from("group_members")
      .select("role")
      .eq("group_id", groupId)
      .eq("user_id", user.id)
      .single()

    if (!membership || !["admin", "moderator"].includes(membership.role)) {
      return Response.json({ error: "غير مصرح" }, { status: 403 })
    }

    // جلب ملف الخلية
    const { data: cellSurvey } = await supabase.from("cell_surveys").select("*").eq("cell_id", groupId).single()

    if (!cellSurvey) {
      return Response.json({ error: "لا يوجد ملف للخلية" }, { status: 404 })
    }

    // جلب المستخدمين الذين ليسوا أعضاء
    const { data: existingMembers } = await supabase.from("group_members").select("user_id").eq("group_id", groupId)

    const existingMemberIds = existingMembers?.map((m) => m.user_id) || []

    // جلب المستخدمين المحتملين
    let query = supabase.from("user_surveys").select(`
        user_id,
        goal,
        skills,
        interests,
        expertise_level,
        interaction_preference,
        profiles!user_id (
          display_name,
          username,
          avatar_url
        )
      `)

    if (existingMemberIds.length > 0) {
      query = query.not("user_id", "in", `(${existingMemberIds.join(",")})`)
    }

    const { data: potentialMembers } = await query

    if (!potentialMembers) {
      return Response.json({ suggestions: [] })
    }

    const suggestions = potentialMembers
      .map((member) => {
        const scores = calculateCompatibilityScore(
          {
            interests: member.interests || [],
            goal: member.goal || "",
            expertise_level: member.expertise_level,
            interaction_preference: member.interaction_preference,
          },
          {
            target_interests: cellSurvey.target_interests || [],
            discussion_style: cellSurvey.discussion_style,
            expertise_level: cellSurvey.expertise_level,
            primary_goal: cellSurvey.primary_goal,
            interaction_style: cellSurvey.interaction_style,
          },
        )

        return {
          ...member,
          compatibility: {
            score: scores.total,
            breakdown: {
              interests: scores.interests.score,
              level: scores.level,
              goal: scores.goal,
              style: scores.style,
            },
            sharedInterests: scores.interests.shared,
          },
        }
      })
      .filter((m) => m.compatibility.score > 60)
      .sort((a, b) => b.compatibility.score - a.compatibility.score)
      .slice(0, limit)

    return Response.json({ suggestions })
  } catch (error) {
    console.error("Suggest members error:", error)
    return Response.json({ error: "حدث خطأ" }, { status: 500 })
  }
}
