import { tool } from "ai"
import * as z from "zod"
import type { createServiceClient } from "@/lib/supabase/server"

type ServiceClient = ReturnType<typeof createServiceClient>

/**
 * أدوات المساعد الذكي — طبقة القراءة الكاملة لنشاط المستخدم.
 *
 * كل أداة محصورة بصلاحيات المستخدم: لا يمكن للمساعد قراءة بيانات خلية
 * لا ينتمي إليها المستخدم. نمرر userId من الجلسة فقط (لا من العميل).
 */

const ROLE_AR: Record<string, string> = {
  admin: "مشرف",
  moderator: "مراقب",
  member: "عضو",
}

const NODE_TYPE_AR: Record<string, string> = {
  question: "سؤال",
  idea: "فكرة",
  announcement: "إعلان",
  discussion: "نقاش",
}

const DECISION_STATUS_AR: Record<string, string> = {
  pending: "قيد الانتظار",
  approved: "مقبول",
  rejected: "مرفوض",
  closed: "مغلق",
}

interface UserCell {
  id: string
  name: string
  role: string
  description: string | null
  goal: string | null
  cell_category: string | null
}

/**
 * يبني مجموعة الأدوات للمستخدم الحالي.
 * نجلب الخلايا مرة واحدة ونمررها للأدوات لضبط الصلاحيات وحل الأسماء.
 */
export function buildAssistantTools(params: {
  supabase: ServiceClient
  userId: string
  userCells: UserCell[]
}) {
  const { supabase, userId, userCells } = params

  const cellIds = userCells.map((c) => c.id)
  // قائمة آمنة للاستخدام في .in() حتى لو كانت فارغة
  const safeCellIds = cellIds.length > 0 ? cellIds : ["00000000-0000-0000-0000-000000000000"]

  /**
   * يحل اسم خلية (أو معرّفها) إلى معرّف ضمن خلايا المستخدم فقط.
   * يعيد null إذا لم تكن الخلية ضمن عضويات المستخدم (حماية).
   */
  function resolveCell(cellNameOrId: string): UserCell | null {
    const term = cellNameOrId.trim().toLowerCase()
    // مطابقة بالمعرّف
    const byId = userCells.find((c) => c.id.toLowerCase() === term)
    if (byId) return byId
    // مطابقة كاملة بالاسم
    const exact = userCells.find((c) => c.name?.toLowerCase() === term)
    if (exact) return exact
    // مطابقة جزئية بالاسم
    const partial = userCells.find((c) => c.name?.toLowerCase().includes(term))
    return partial || null
  }

  const getMyProfile = tool({
    description:
      "جلب الملف الشخصي للمستخدم وإحصائيات نشاطه الكاملة (عدد الرسائل، القرارات، المهام، التفاعلات، النقاط، الألقاب). استخدمها عند السؤال عن الحساب أو الإنجازات أو الإحصائيات الشخصية.",
    inputSchema: z.object({}),
    execute: async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, username, bio, total_points, responsibility_score")
        .eq("id", userId)
        .single()

      const [{ count: messagesCount }, { count: nodesCount }, { count: votesCount }, { count: decisionsCreated }, { count: reactionsCount }, { count: tasksCompleted }] =
        await Promise.all([
          supabase.from("messages").select("*", { count: "exact", head: true }).eq("sender_id", userId),
          supabase.from("conversation_nodes").select("*", { count: "exact", head: true }).eq("created_by", userId),
          supabase.from("decision_votes").select("*", { count: "exact", head: true }).eq("user_id", userId),
          supabase.from("decisions").select("*", { count: "exact", head: true }).eq("created_by", userId),
          supabase.from("message_reactions").select("*", { count: "exact", head: true }).eq("user_id", userId),
          supabase
            .from("extracted_tasks")
            .select("*", { count: "exact", head: true })
            .eq("assigned_to", userId)
            .eq("status", "completed"),
        ])

      const { data: titles } = await supabase
        .from("user_titles")
        .select("titles (name_ar, description_ar, rarity)")
        .eq("user_id", userId)
        .eq("is_visible", true)

      return {
        name: profile?.display_name || profile?.username || "مستخدم",
        bio: profile?.bio || null,
        total_points: profile?.total_points || 0,
        responsibility_score: profile?.responsibility_score || 0,
        stats: {
          messages_sent: messagesCount || 0,
          nodes_created: nodesCount || 0,
          decisions_voted: votesCount || 0,
          decisions_created: decisionsCreated || 0,
          reactions_given: reactionsCount || 0,
          tasks_completed: tasksCompleted || 0,
        },
        titles: (titles || []).map((t: any) => ({
          name: t.titles?.name_ar,
          description: t.titles?.description_ar,
          rarity: t.titles?.rarity,
        })),
      }
    },
  })

  const listMyCells = tool({
    description:
      "عرض قائمة الخلايا (المجموعات) التي ينتمي إليها المستخدم مع دوره ووصفها وهدفها. استخدمها لمعرفة خلايا المستخدم أو قبل البحث داخل خلية معينة.",
    inputSchema: z.object({}),
    execute: async () => {
      return {
        count: userCells.length,
        cells: userCells.map((c) => ({
          name: c.name,
          role: ROLE_AR[c.role] || c.role,
          description: c.description || null,
          goal: c.goal || null,
          category: c.cell_category === "project" ? "مشروع" : c.cell_category === "discussion" ? "نقاش" : c.cell_category,
        })),
      }
    },
  })

  const searchMessages = tool({
    description:
      "البحث في الرسائل بكلمة مفتاحية عبر كل خلايا المستخدم أو داخل خلية محددة. استخدمها للإجابة عن أسئلة مثل 'ماذا قيل عن الميزانية؟' أو 'ابحث عن نقاش حول كذا'. يعيد الرسائل المطابقة مع اسم المرسل والخلية والتاريخ.",
    inputSchema: z.object({
      query: z.string().describe("الكلمة أو العبارة المراد البحث عنها في محتوى الرسائل"),
      cellName: z
        .string()
        .optional()
        .describe("اسم الخلية لحصر البحث فيها (اختياري). إذا تُرك فارغاً يبحث في كل خلايا المستخدم"),
      limit: z.coerce.number().min(1).max(30).optional().describe("عدد النتائج (افتراضي 15)"),
    }),
    execute: async ({ query, cellName, limit }) => {
      let targetCellIds = safeCellIds
      if (cellName) {
        const cell = resolveCell(cellName)
        if (!cell) {
          return { error: `لم يتم العثور على خلية باسم "${cellName}" ضمن خلاياك.`, results: [] }
        }
        targetCellIds = [cell.id]
      }

      const { data: rows } = await supabase
        .from("messages")
        .select(
          "content, created_at, sender_id, groups (name), conversation_nodes (title), profiles!messages_sender_id_fkey (display_name, username)",
        )
        .in("group_id", targetCellIds)
        .ilike("content", `%${query}%`)
        .order("created_at", { ascending: false })
        .limit(limit || 15)

      return {
        count: rows?.length || 0,
        results: (rows || []).map((m: any) => ({
          content: m.content,
          sender: m.profiles?.display_name || m.profiles?.username || "عضو",
          cell: m.groups?.name || "خلية",
          node: m.conversation_nodes?.title || null,
          date: m.created_at,
        })),
      }
    },
  })

  const getCellMessages = tool({
    description:
      "جلب أحدث الرسائل من خلية محددة (آخر النقاشات فيها). استخدمها عند السؤال 'ماذا يحدث في خلية كذا؟' أو 'لخص آخر نقاشات الخلية الفلانية'.",
    inputSchema: z.object({
      cellName: z.string().describe("اسم الخلية المراد جلب رسائلها"),
      limit: z.coerce.number().min(1).max(50).optional().describe("عدد الرسائل (افتراضي 25)"),
    }),
    execute: async ({ cellName, limit }) => {
      const cell = resolveCell(cellName)
      if (!cell) {
        return { error: `لم يتم العثور على خلية باسم "${cellName}" ضمن خلاياك.`, messages: [] }
      }

      const { data: rows } = await supabase
        .from("messages")
        .select("content, created_at, profiles!messages_sender_id_fkey (display_name, username), conversation_nodes (title)")
        .eq("group_id", cell.id)
        .order("created_at", { ascending: false })
        .limit(limit || 25)

      return {
        cell: cell.name,
        count: rows?.length || 0,
        // نرتبها تصاعدياً ليكون السياق منطقياً للقراءة
        messages: (rows || []).reverse().map((m: any) => ({
          content: m.content,
          sender: m.profiles?.display_name || m.profiles?.username || "عضو",
          node: m.conversation_nodes?.title || null,
          date: m.created_at,
        })),
      }
    },
  })

  const getMyRecentMessages = tool({
    description:
      "جلب آخر رسائل المستخدم نفسه عبر كل الخلايا. استخدمها عند السؤال 'ماذا كتبت مؤخراً؟' أو 'ذكّرني بآخر مشاركاتي'.",
    inputSchema: z.object({
      limit: z.coerce.number().min(1).max(30).optional().describe("عدد الرسائل (افتراضي 15)"),
    }),
    execute: async ({ limit }) => {
      const { data: rows } = await supabase
        .from("messages")
        .select("content, created_at, groups (name), conversation_nodes (title)")
        .eq("sender_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit || 15)

      return {
        count: rows?.length || 0,
        messages: (rows || []).map((m: any) => ({
          content: m.content,
          cell: m.groups?.name || "خلية",
          node: m.conversation_nodes?.title || null,
          date: m.created_at,
        })),
      }
    },
  })

  const getDecisions = tool({
    description:
      "جلب القرارات في خلايا المستخدم (مع الحالة: قيد الانتظار/مقبول/مرفوض). يمكن حصرها بخلية معينة أو حالة معينة. استخدمها عند السؤال عن القرارات أو التصويتات.",
    inputSchema: z.object({
      cellName: z.string().optional().describe("اسم الخلية لحصر القرارات (اختياري)"),
      status: z
        .enum(["pending", "approved", "rejected", "closed"])
        .optional()
        .describe("حالة القرار لتصفية النتائج (اختياري)"),
      limit: z.coerce.number().min(1).max(20).optional().describe("عدد القرارات (افتراضي 10)"),
    }),
    execute: async ({ cellName, status, limit }) => {
      let targetCellIds = safeCellIds
      if (cellName) {
        const cell = resolveCell(cellName)
        if (!cell) return { error: `لم يتم العثور على خلية باسم "${cellName}".`, decisions: [] }
        targetCellIds = [cell.id]
      }

      let q = supabase
        .from("decisions")
        .select("title, description, status, created_at, voting_ends_at, groups (name), profiles!decisions_created_by_fkey (display_name)")
        .in("group_id", targetCellIds)
        .order("created_at", { ascending: false })
        .limit(limit || 10)

      if (status) q = q.eq("status", status)

      const { data: rows } = await q

      return {
        count: rows?.length || 0,
        decisions: (rows || []).map((d: any) => ({
          title: d.title,
          description: d.description,
          status: DECISION_STATUS_AR[d.status] || d.status,
          cell: d.groups?.name || "خلية",
          created_by: d.profiles?.display_name || "عضو",
          date: d.created_at,
          voting_ends_at: d.voting_ends_at || null,
        })),
      }
    },
  })

  const getTasks = tool({
    description:
      "جلب المهام المستخرجة الخاصة بالمستخدم (المسندة إليه أو التي أنشأها). يمكن تصفيتها بالحالة. استخدمها عند السؤال 'ما مهامي؟' أو 'ماذا عليّ أن أفعل؟'.",
    inputSchema: z.object({
      status: z
        .enum(["pending", "completed", "in_progress"])
        .optional()
        .describe("حالة المهمة (اختياري، افتراضياً كل الحالات)"),
      limit: z.coerce.number().min(1).max(30).optional().describe("عدد المهام (افتراضي 15)"),
    }),
    execute: async ({ status, limit }) => {
      let q = supabase
        .from("extracted_tasks")
        .select("task_content, status, due_date, created_at, completed_at, groups (name)")
        .or(`assigned_to.eq.${userId},created_by.eq.${userId}`)
        .order("created_at", { ascending: false })
        .limit(limit || 15)

      if (status) q = q.eq("status", status)

      const { data: rows } = await q

      return {
        count: rows?.length || 0,
        tasks: (rows || []).map((t: any) => ({
          content: t.task_content,
          status: t.status,
          cell: t.groups?.name || "خلية",
          due_date: t.due_date || null,
          completed_at: t.completed_at || null,
        })),
      }
    },
  })

  const getCellSummaries = tool({
    description:
      "جلب الملخصات اليومية والذاكرة الجماعية لخلايا المستخدم (المواضيع، القرارات، الأفكار، النقاط المعلقة). استخدمها عند السؤال 'لخص ما حدث' أو 'ما أهم النقاط الأخيرة؟'.",
    inputSchema: z.object({
      cellName: z.string().optional().describe("اسم الخلية لحصر الملخصات (اختياري)"),
      limit: z.coerce.number().min(1).max(10).optional().describe("عدد الملخصات (افتراضي 5)"),
    }),
    execute: async ({ cellName, limit }) => {
      let targetCellIds = safeCellIds
      if (cellName) {
        const cell = resolveCell(cellName)
        if (!cell) return { error: `لم يتم العثور على خلية باسم "${cellName}".`, summaries: [] }
        targetCellIds = [cell.id]
      }

      const { data: rows } = await supabase
        .from("daily_summaries")
        .select("summary_date, raw_message_count, topics, decisions, ideas, pending_items, groups (name)")
        .in("group_id", targetCellIds)
        .order("summary_date", { ascending: false })
        .limit(limit || 5)

      return {
        count: rows?.length || 0,
        summaries: (rows || []).map((s: any) => ({
          date: s.summary_date,
          cell: s.groups?.name || "خلية",
          message_count: s.raw_message_count || 0,
          topics: s.topics || [],
          decisions: s.decisions || [],
          ideas: s.ideas || [],
          pending_items: s.pending_items || [],
        })),
      }
    },
  })

  const getNodes = tool({
    description:
      "جلب عقد المحادثة (المواضيع/الأسئلة/الأفكار/الإعلانات) في خلايا المستخدم. استخدمها عند السؤال عن المواضيع المطروحة أو هيكل النقاشات.",
    inputSchema: z.object({
      cellName: z.string().optional().describe("اسم الخلية لحصر العقد (اختياري)"),
      limit: z.coerce.number().min(1).max(20).optional().describe("عدد العقد (افتراضي 10)"),
    }),
    execute: async ({ cellName, limit }) => {
      let targetCellIds = safeCellIds
      if (cellName) {
        const cell = resolveCell(cellName)
        if (!cell) return { error: `لم يتم العثور على خلية باسم "${cellName}".`, nodes: [] }
        targetCellIds = [cell.id]
      }

      const { data: rows } = await supabase
        .from("conversation_nodes")
        .select("title, description, node_type, created_at, groups (name)")
        .in("group_id", targetCellIds)
        .order("created_at", { ascending: false })
        .limit(limit || 10)

      return {
        count: rows?.length || 0,
        nodes: (rows || []).map((n: any) => ({
          title: n.title,
          description: n.description || null,
          type: NODE_TYPE_AR[n.node_type] || n.node_type,
          cell: n.groups?.name || "خلية",
          date: n.created_at,
        })),
      }
    },
  })

  const getNotifications = tool({
    description:
      "جلب إشعارات المستخدم (افتراضياً غير المقروءة). استخدمها عند السؤال 'هل لدي إشعارات؟' أو 'ماذا فاتني؟'.",
    inputSchema: z.object({
      unreadOnly: z.boolean().optional().describe("الاقتصار على غير المقروءة (افتراضي true)"),
      limit: z.coerce.number().min(1).max(20).optional().describe("عدد الإشعارات (افتراضي 10)"),
    }),
    execute: async ({ unreadOnly, limit }) => {
      let q = supabase
        .from("notifications")
        .select("title, body, type, is_read, created_at, groups (name)")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit || 10)

      if (unreadOnly !== false) q = q.eq("is_read", false)

      const { data: rows } = await q

      return {
        count: rows?.length || 0,
        notifications: (rows || []).map((n: any) => ({
          title: n.title,
          body: n.body,
          type: n.type,
          is_read: n.is_read,
          cell: n.groups?.name || null,
          date: n.created_at,
        })),
      }
    },
  })

  const getMyActivity = tool({
    description:
      "جلب سجل نشاط المستخدم الأخير (الأفعال التي قام بها مع النقاط المكتسبة). استخدمها عند السؤال عن النشاط الأخير أو مصدر النقاط.",
    inputSchema: z.object({
      limit: z.coerce.number().min(1).max(30).optional().describe("عدد السجلات (افتراضي 15)"),
    }),
    execute: async ({ limit }) => {
      const { data: rows } = await supabase
        .from("user_activity_log")
        .select("activity_type, activity_category, points_earned, created_at, groups (name)")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit || 15)

      return {
        count: rows?.length || 0,
        activities: (rows || []).map((a: any) => ({
          type: a.activity_type,
          category: a.activity_category,
          points: a.points_earned || 0,
          cell: a.groups?.name || null,
          date: a.created_at,
        })),
      }
    },
  })

  return {
    getMyProfile,
    listMyCells,
    searchMessages,
    getCellMessages,
    getMyRecentMessages,
    getDecisions,
    getTasks,
    getCellSummaries,
    getNodes,
    getNotifications,
    getMyActivity,
  }
}
