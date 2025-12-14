// نظام المطابقة المشبكية الذكية
// Smart Synaptic Matching System

import { createClient } from "@/lib/supabase/client"

// الاهتمامات المشتركة بين استبيان المستخدم واستبيان الخلية
const INTERESTS_MAPPING: Record<string, string[]> = {
  "الذكاء الاصطناعي وتعلم الآلة": ["الذكاء الاصطناعي وتعلم الآلة", "علم البيانات"],
  "تطوير الويب": ["تطوير الويب", "تطوير التطبيقات"],
  "الفلسفة والمنطق": ["الفلسفة والمنطق", "النقد الأدبي"],
  "ريادة الأعمال": ["ريادة الأعمال", "القيادة والإدارة"],
  // ... يمكن إضافة المزيد
}

interface UserSurvey {
  goal?: string
  skills?: string
  best_conversation?: string
  time_wasters?: string
  dream_cell_topic?: string
  interests?: string[]
  cognitive_style?: string
  expertise_level?: string
  interaction_preference?: string
}

interface CellSurvey {
  discussion_style?: string
  expertise_level?: string
  primary_goal?: string
  interaction_style?: string
  ideal_member_description?: string
  target_interests?: string[]
  min_responsibility_score?: number
}

interface MatchResult {
  groupId: string
  groupName: string
  groupDescription?: string
  groupImage?: string
  memberCount: number
  compatibilityScore: number
  interestsScore: number
  levelScore: number
  goalScore: number
  styleScore: number
  sharedInterests: string[]
  cellType?: string
}

// حساب درجة تطابق الاهتمامات (40% من الدرجة الكلية)
function calculateInterestsScore(
  userInterests: string[],
  cellInterests: string[],
): { score: number; shared: string[] } {
  if (!userInterests?.length || !cellInterests?.length) {
    return { score: 0, shared: [] }
  }

  const shared: string[] = []

  for (const userInterest of userInterests) {
    // تطابق مباشر
    if (cellInterests.includes(userInterest)) {
      shared.push(userInterest)
      continue
    }

    // تطابق غير مباشر (اهتمامات مرتبطة)
    const relatedInterests = INTERESTS_MAPPING[userInterest] || []
    for (const related of relatedInterests) {
      if (cellInterests.includes(related) && !shared.includes(related)) {
        shared.push(related)
        break
      }
    }
  }

  const score = Math.min(100, (shared.length / Math.min(userInterests.length, cellInterests.length)) * 100)
  return { score, shared }
}

// حساب درجة تطابق المستوى (20% من الدرجة الكلية)
function calculateLevelScore(userLevel: string | undefined, cellLevel: string | undefined): number {
  if (!userLevel || !cellLevel) return 50 // متوسط إذا لم يحدد

  if (cellLevel === "mixed") return 100 // الخلية تقبل جميع المستويات

  const levels = ["beginner", "intermediate", "advanced"]
  const userIdx = levels.indexOf(userLevel)
  const cellIdx = levels.indexOf(cellLevel)

  if (userIdx === -1 || cellIdx === -1) return 50

  const diff = Math.abs(userIdx - cellIdx)

  if (diff === 0) return 100
  if (diff === 1) return 70
  return 40
}

// حساب درجة تطابق الأهداف (20% من الدرجة الكلية)
function calculateGoalScore(userGoal: string | undefined, cellGoal: string | undefined): number {
  if (!userGoal || !cellGoal) return 50

  // تحليل بسيط بالكلمات المفتاحية
  const keywords = {
    learning: ["تعلم", "معرفة", "فهم", "دراسة", "learn", "knowledge"],
    project: ["مشروع", "بناء", "تطوير", "إنشاء", "project", "build"],
    discussion: ["نقاش", "حوار", "تبادل", "آراء", "discuss", "debate"],
    networking: ["تواصل", "شبكة", "علاقات", "network", "connect"],
  }

  let matches = 0
  let total = 0

  for (const [, words] of Object.entries(keywords)) {
    const userHas = words.some((w) => userGoal.toLowerCase().includes(w))
    const cellHas = words.some((w) => cellGoal.toLowerCase().includes(w))

    if (userHas || cellHas) {
      total++
      if (userHas && cellHas) matches++
    }
  }

  if (total === 0) return 50
  return Math.round((matches / total) * 100)
}

// حساب درجة تطابق أسلوب التفاعل (20% من الدرجة الكلية)
function calculateStyleScore(userStyle: string | undefined, cellStyle: string | undefined): number {
  if (!userStyle || !cellStyle) return 50

  const styleCompatibility: Record<string, Record<string, number>> = {
    collaborative: { collaborative: 100, brainstorming: 80, debate: 60, structured: 70 },
    debate: { debate: 100, brainstorming: 70, collaborative: 60, structured: 50 },
    brainstorming: { brainstorming: 100, collaborative: 80, debate: 70, structured: 60 },
    structured: { structured: 100, collaborative: 70, brainstorming: 60, debate: 50 },
  }

  return styleCompatibility[userStyle]?.[cellStyle] ?? 50
}

// حساب درجة التوافق الكلية
export function calculateCompatibilityScore(
  userSurvey: UserSurvey,
  cellSurvey: CellSurvey,
): {
  total: number
  interests: { score: number; shared: string[] }
  level: number
  goal: number
  style: number
} {
  const interests = calculateInterestsScore(userSurvey.interests || [], cellSurvey.target_interests || [])

  const level = calculateLevelScore(userSurvey.expertise_level, cellSurvey.expertise_level)

  const goal = calculateGoalScore(userSurvey.goal, cellSurvey.primary_goal)

  const style = calculateStyleScore(userSurvey.interaction_preference, cellSurvey.interaction_style)

  // الأوزان: الاهتمامات 40%، المستوى 20%، الأهداف 20%، الأسلوب 20%
  const total = Math.round(interests.score * 0.4 + level * 0.2 + goal * 0.2 + style * 0.2)

  return { total, interests, level, goal, style }
}

// جلب الخلايا المقترحة للمستخدم
export async function getSuggestedCells(userId: string, limit = 10): Promise<MatchResult[]> {
  const supabase = createClient()

  // جلب استبيان المستخدم
  const { data: userSurvey } = await supabase.from("user_surveys").select("*").eq("user_id", userId).single()

  if (!userSurvey) {
    return []
  }

  // جلب الخلايا التي لم ينضم إليها المستخدم
  const { data: groups } = await supabase
    .from("groups")
    .select(`
      id,
      name,
      description,
      image_url,
      cell_type,
      group_members(count)
    `)
    .not(
      "id",
      "in",
      `(
      SELECT group_id FROM group_members WHERE user_id = '${userId}'
    )`,
    )
    .limit(50)

  if (!groups?.length) {
    return []
  }

  // جلب استبيانات الخلايا
  const groupIds = groups.map((g) => g.id)
  const { data: cellSurveys } = await supabase.from("cell_surveys").select("*").in("group_id", groupIds)

  const cellSurveysMap = new Map(cellSurveys?.map((s) => [s.group_id, s]) || [])

  // حساب درجات التوافق
  const results: MatchResult[] = []

  for (const group of groups) {
    const cellSurvey = cellSurveysMap.get(group.id)

    // إذا لم يكن للخلية استبيان، نستخدم قيم افتراضية
    const survey: CellSurvey = cellSurvey || {
      target_interests: [],
      expertise_level: "mixed",
    }

    const scores = calculateCompatibilityScore(userSurvey, survey)

    results.push({
      groupId: group.id,
      groupName: group.name,
      groupDescription: group.description,
      groupImage: group.image_url,
      memberCount: (group.group_members as any)?.[0]?.count || 0,
      compatibilityScore: scores.total,
      interestsScore: scores.interests.score,
      levelScore: scores.level,
      goalScore: scores.goal,
      styleScore: scores.style,
      sharedInterests: scores.interests.shared,
      cellType: group.cell_type,
    })
  }

  // ترتيب حسب درجة التوافق
  results.sort((a, b) => b.compatibilityScore - a.compatibilityScore)

  return results.slice(0, limit)
}

// جلب درجة توافق مستخدم مع خلية معينة (لعرضها لمالك الخلية)
export async function getUserCellCompatibility(
  userId: string,
  groupId: string,
): Promise<{
  score: number
  details: {
    interests: { score: number; shared: string[] }
    level: number
    goal: number
    style: number
  }
  userProfile: {
    goal?: string
    skills?: string
    interests?: string[]
  }
} | null> {
  const supabase = createClient()

  const [{ data: userSurvey }, { data: cellSurvey }] = await Promise.all([
    supabase.from("user_surveys").select("*").eq("user_id", userId).single(),
    supabase.from("cell_surveys").select("*").eq("group_id", groupId).single(),
  ])

  if (!userSurvey) return null

  const survey: CellSurvey = cellSurvey || {
    target_interests: [],
    expertise_level: "mixed",
  }

  const scores = calculateCompatibilityScore(userSurvey, survey)

  return {
    score: scores.total,
    details: {
      interests: scores.interests,
      level: scores.level,
      goal: scores.goal,
      style: scores.style,
    },
    userProfile: {
      goal: userSurvey.goal,
      skills: userSurvey.skills,
      interests: userSurvey.interests,
    },
  }
}
