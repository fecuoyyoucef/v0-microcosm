// نظام تتبع النشاط ومنح النقاط
import { createClient } from "@/lib/supabase/server"

export type ActivityType =
  // Leadership activities
  | "node_created"
  | "subgroup_created"
  | "discussion_moderated"
  | "group_created"
  // Analysis activities
  | "focused_message_sent"
  | "summary_created"
  | "problem_solved"
  | "node_summarized"
  // Initiative activities
  | "new_topic_started"
  | "valuable_node_created"
  // Communication activities
  | "question_answered"
  | "member_helped"
  | "message_sent"
  | "response_sent"
  // Wisdom activities
  | "conflict_resolved"
  | "rational_intervention"
  // General activities
  | "decision_voted"
  | "decision_created"

export interface ActivityPoints {
  [key: string]: {
    points: number
    category: "leadership" | "analysis" | "initiative" | "communication" | "wisdom" | "general"
    description: string
  }
}

export const ACTIVITY_POINTS: ActivityPoints = {
  // Leadership (10-50 points)
  node_created: { points: 15, category: "leadership", description: "إنشاء عقدة جديدة" },
  subgroup_created: { points: 50, category: "leadership", description: "إنشاء خلية فرعية" },
  discussion_moderated: { points: 25, category: "leadership", description: "إدارة نقاش" },
  group_created: { points: 100, category: "leadership", description: "إنشاء خلية جديدة" },

  // Analysis (5-30 points)
  focused_message_sent: { points: 10, category: "analysis", description: "رسالة مركزة" },
  summary_created: { points: 30, category: "analysis", description: "إنشاء ملخص" },
  problem_solved: { points: 25, category: "analysis", description: "حل مشكلة" },
  node_summarized: { points: 20, category: "analysis", description: "تلخيص عقدة" },

  // Initiative (10-40 points)
  new_topic_started: { points: 20, category: "initiative", description: "بدء موضوع جديد" },
  valuable_node_created: { points: 40, category: "initiative", description: "عقدة قيمة" },

  // Communication (3-15 points)
  question_answered: { points: 10, category: "communication", description: "إجابة سؤال" },
  member_helped: { points: 15, category: "communication", description: "مساعدة عضو" },
  message_sent: { points: 3, category: "communication", description: "إرسال رسالة" },
  response_sent: { points: 5, category: "communication", description: "الرد على رسالة" },

  // Wisdom (20-50 points)
  conflict_resolved: { points: 50, category: "wisdom", description: "حل نزاع" },
  rational_intervention: { points: 30, category: "wisdom", description: "تدخل عقلاني" },

  // General (5-10 points)
  decision_voted: { points: 5, category: "general", description: "التصويت على قرار" },
  decision_created: { points: 20, category: "general", description: "إنشاء قرار" },
}

export async function trackActivity(
  userId: string,
  activityType: ActivityType,
  groupId?: string,
  metadata?: Record<string, any>,
) {
  const supabase = await createClient()

  const activityConfig = ACTIVITY_POINTS[activityType]
  if (!activityConfig) {
    console.error(`Unknown activity type: ${activityType}`)
    return
  }

  // تسجيل النشاط
  const { error } = await supabase.from("user_activity_log").insert({
    user_id: userId,
    group_id: groupId,
    activity_type: activityType,
    activity_category: activityConfig.category,
    points_earned: activityConfig.points,
    metadata: metadata || {},
  })

  if (error) {
    console.error("Error tracking activity:", error)
    return
  }

  // تحديث الإحصائيات المحددة
  await updateSpecificStats(userId, activityType)

  // التحقق من الألقاب الجديدة
  await checkAndAwardTitles(userId)
}

async function updateSpecificStats(userId: string, activityType: ActivityType) {
  const supabase = await createClient()

  const updates: Record<string, number> = {}

  // تحديد أي إحصائية يجب تحديثها بناءً على نوع النشاط
  switch (activityType) {
    case "node_created":
      updates.nodes_created = 1
      break
    case "subgroup_created":
      updates.subgroups_created = 1
      break
    case "discussion_moderated":
      updates.discussions_moderated = 1
      break
    case "focused_message_sent":
      updates.focused_messages = 1
      break
    case "summary_created":
    case "node_summarized":
      updates.summaries_created = 1
      break
    case "problem_solved":
      updates.problems_solved = 1
      break
    case "new_topic_started":
      updates.new_topics_started = 1
      break
    case "valuable_node_created":
      updates.valuable_nodes_created = 1
      break
    case "question_answered":
      updates.questions_answered = 1
      break
    case "member_helped":
      updates.members_helped = 1
      break
    case "message_sent":
    case "response_sent":
      updates.responses_count = 1
      updates.messages_sent = 1
      break
    case "conflict_resolved":
      updates.conflicts_resolved = 1
      break
    case "rational_intervention":
      updates.rational_interventions = 1
      break
    case "decision_voted":
      updates.decisions_voted = 1
      break
  }

  if (Object.keys(updates).length > 0) {
    // بناء SQL لتحديث الحقول
    const updateFields = Object.entries(updates)
      .map(([key]) => `${key} = COALESCE(${key}, 0) + 1`)
      .join(", ")

    await supabase.rpc("update_user_stats", {
      p_user_id: userId,
      p_updates: updateFields,
    })
  }
}

async function checkAndAwardTitles(userId: string) {
  const supabase = await createClient()

  // جلب إحصائيات المستخدم
  const { data: stats } = await supabase.from("user_stats").select("*").eq("user_id", userId).single()

  if (!stats) return

  // جلب جميع الألقاب
  const { data: titles } = await supabase.from("titles").select("*").eq("is_active", true)

  if (!titles) return

  // التحقق من كل لقب
  for (const title of titles) {
    // تحقق إذا كان لديه اللقب بالفعل
    const { data: hasTitle } = await supabase
      .from("user_titles")
      .select("id")
      .eq("user_id", userId)
      .eq("title_id", title.id)
      .single()

    if (hasTitle) continue

    // التحقق من المتطلبات
    const requirements = title.required_activities as Record<string, number>
    let meetsRequirements = true

    if (requirements) {
      for (const [key, value] of Object.entries(requirements)) {
        const statValue = (stats as any)[key] || 0
        if (statValue < value) {
          meetsRequirements = false
          break
        }
      }
    }

    // التحقق من النقاط
    if (stats.total_points < title.required_points) {
      meetsRequirements = false
    }

    // منح اللقب
    if (meetsRequirements) {
      await supabase.from("user_titles").insert({
        user_id: userId,
        title_id: title.id,
        earned_at: new Date().toISOString(),
      })

      // إنشاء إشعار
      await supabase.from("notifications").insert({
        user_id: userId,
        type: "title_earned",
        title: "لقب جديد! 🎉",
        body: `تهانينا! لقد حصلت على لقب: ${title.name_ar}`,
        data: {
          title_id: title.id,
          title_name: title.name_ar,
          title_icon: title.icon,
        },
      })
    }
  }
}

// دالة للحصول على ألقاب المستخدم
export async function getUserTitles(userId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("user_titles")
    .select(
      `
      *,
      title:titles(*)
    `,
    )
    .eq("user_id", userId)
    .eq("is_visible", true)
    .order("earned_at", { ascending: false })

  if (error) {
    console.error("Error fetching user titles:", error)
    return []
  }

  return data
}

// دالة للحصول على إحصائيات المستخدم
export async function getUserStats(userId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase.from("user_stats").select("*").eq("user_id", userId).single()

  if (error) {
    console.error("Error fetching user stats:", error)
    return null
  }

  return data
}

// دالة لتعيين اللقب النشط
export async function setActiveTitle(userId: string, titleId: string | null) {
  const supabase = await createClient()

  const { error } = await supabase.from("profiles").update({ active_title_id: titleId }).eq("id", userId)

  if (error) {
    console.error("Error setting active title:", error)
    return false
  }

  return true
}
