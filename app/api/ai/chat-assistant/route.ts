import { createClient } from "@/lib/supabase/server"
import { generateAIText } from "@/lib/ai"

export async function POST(req: Request) {
  try {
    const { messages, userId } = await req.json()

    console.log("[v0] Chat assistant request:", { messagesCount: messages?.length, userId })

    if (!messages || !Array.isArray(messages)) {
      return Response.json({ error: "رسائل غير صالحة" }, { status: 400 })
    }

    const supabase = await createClient()

    // التحقق من المستخدم
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      console.log("[v0] No authenticated user")
      return Response.json({ error: "غير مصرح" }, { status: 401 })
    }

    // 1. معلومات المستخدم الشاملة
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, username, bio, total_points, responsibility_score")
      .eq("id", user.id)
      .single()

    // 2. إحصائيات نشاط المستخدم
    const { data: userStats } = await supabase.from("user_stats").select("*").eq("user_id", user.id).single()

    // 3. الخلايا المنضمة
    const { data: userGroups } = await supabase
      .from("group_members")
      .select(`
        role,
        groups (
          id,
          name,
          description,
          goal,
          cell_category,
          max_members
        )
      `)
      .eq("user_id", user.id)

    // 4. آخر 10 رسائل من المستخدم
    const { data: recentMessages } = await supabase
      .from("messages")
      .select(`
        content,
        created_at,
        groups (name),
        conversation_nodes (title)
      `)
      .eq("sender_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10)

    // 5. آخر 5 قرارات من الخلايا المنضمة
    const groupIds = userGroups?.map((gm) => (gm.groups as any)?.id).filter(Boolean) || []
    const { data: recentDecisions } = await supabase
      .from("decisions")
      .select(`
        title,
        description,
        status,
        created_at,
        groups (name),
        profiles!decisions_created_by_fkey (display_name)
      `)
      .in("group_id", groupIds.length > 0 ? groupIds : [""])
      .order("created_at", { ascending: false })
      .limit(5)

    // 6. آخر 5 عقد من الخلايا المنضمة
    const { data: recentNodes } = await supabase
      .from("conversation_nodes")
      .select(`
        title,
        description,
        node_type,
        created_at,
        groups (name)
      `)
      .in("group_id", groupIds.length > 0 ? groupIds : [""])
      .order("created_at", { ascending: false })
      .limit(5)

    // 7. الإنجازات والألقاب
    const { data: userTitles } = await supabase
      .from("user_titles")
      .select(`
        earned_at,
        titles (
          name_ar,
          description_ar,
          rarity,
          category
        )
      `)
      .eq("user_id", user.id)
      .eq("is_visible", true)

    // 8. آخر 3 ملخصات يومية
    const { data: recentSummaries } = await supabase
      .from("daily_summaries")
      .select(`
        summary_date,
        raw_message_count,
        topics,
        decisions,
        groups (name)
      `)
      .in("group_id", groupIds.length > 0 ? groupIds : [""])
      .order("summary_date", { ascending: false })
      .limit(3)

    // 9. المهام النشطة
    const { data: activeTasks } = await supabase
      .from("extracted_tasks")
      .select(`
        task_content,
        status,
        due_date,
        groups (name)
      `)
      .or(`assigned_to.eq.${user.id},created_by.eq.${user.id}`)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(5)

    // 10. آخر الإشعارات غير المقروءة
    const { data: unreadNotifications } = await supabase
      .from("notifications")
      .select("title, body, type, created_at")
      .eq("user_id", user.id)
      .eq("is_read", false)
      .order("created_at", { ascending: false })
      .limit(5)

    // بناء السياق الشامل
    const context = `
أنت مساعد ذكي متقدم لتطبيق Synaptic Space - منصة محادثات ومناقشات جماعية ذكية.

# معلومات المستخدم
الاسم: ${profile?.display_name || profile?.username || "مستخدم"}
السيرة الذاتية: ${profile?.bio || "لا توجد"}
النقاط الإجمالية: ${profile?.total_points || 0}
مقياس المسؤولية: ${profile?.responsibility_score || 0}

# إحصائيات النشاط
${
  userStats
    ? `
- الرسائل المرسلة: ${userStats.messages_sent || 0}
- العقد المنشأة: ${userStats.nodes_created || 0}
- القرارات المصوت عليها: ${userStats.decisions_voted || 0}
- المشاكل المحلولة: ${userStats.problems_solved || 0}
- الأسئلة المجابة: ${userStats.questions_answered || 0}
- متوسط جودة الرسائل: ${userStats.avg_message_quality || 0}
- مقياس الاتساق: ${userStats.consistency_score || 0}
`
    : "لا توجد إحصائيات"
}

# الخلايا المنضمة (${userGroups?.length || 0})
${
  userGroups
    ?.map((gm: any) => {
      const group = gm.groups
      return `- ${group?.name} (${gm.role}): ${group?.description || "لا يوجد وصف"}
  الهدف: ${group?.goal || "غير محدد"}
  التصنيف: ${group?.cell_category || "عام"}
  الحد الأقصى للأعضاء: ${group?.max_members || "غير محدود"}`
    })
    .join("\n") || "لا توجد خلايا"
}

# آخر الرسائل من المستخدم
${
  recentMessages
    ?.map(
      (msg: any) =>
        `[${msg.groups?.name || "غير معروف"}${msg.conversation_nodes?.title ? ` - ${msg.conversation_nodes.title}` : ""}]: ${msg.content?.substring(0, 100)}${msg.content?.length > 100 ? "..." : ""}`,
    )
    .join("\n") || "لا توجد رسائل"
}

# آخر القرارات في الخلايا
${
  recentDecisions
    ?.map(
      (d: any) =>
        `- ${d.title} (${d.groups?.name || "غير معروف"})
  الحالة: ${d.status}
  أنشأها: ${d.profiles?.display_name || "غير معروف"}
  الوصف: ${d.description?.substring(0, 150)}${d.description?.length > 150 ? "..." : ""}`,
    )
    .join("\n\n") || "لا توجد قرارات"
}

# آخر العقد (المواضيع)
${
  recentNodes
    ?.map(
      (n: any) =>
        `- ${n.title} [${n.node_type || "عام"}] (${n.groups?.name || "غير معروف"})
  ${n.description ? `الوصف: ${n.description.substring(0, 100)}${n.description.length > 100 ? "..." : ""}` : ""}`,
    )
    .join("\n") || "لا توجد عقد"
}

# الإنجازات والألقاب (${userTitles?.length || 0})
${
  userTitles
    ?.map((ut: any) => `- ${ut.titles?.name_ar} (${ut.titles?.rarity}) - ${ut.titles?.description_ar}`)
    .join("\n") || "لا توجد ألقاب"
}

# آخر الملخصات اليومية
${
  recentSummaries
    ?.map(
      (s: any) =>
        `[${s.summary_date}] ${s.groups?.name || "غير معروف"}
  عدد الرسائل: ${s.raw_message_count || 0}
  المواضيع: ${JSON.stringify(s.topics || []).substring(0, 100)}
  القرارات: ${JSON.stringify(s.decisions || []).substring(0, 100)}`,
    )
    .join("\n\n") || "لا توجد ملخصات"
}

# المهام النشطة (${activeTasks?.length || 0})
${
  activeTasks
    ?.map(
      (t: any) =>
        `- ${t.task_content} (${t.groups?.name || "غير معروف"})
  الموعد النهائي: ${t.due_date || "غير محدد"}
  الحالة: ${t.status}`,
    )
    .join("\n") || "لا توجد مهام"
}

# الإشعارات غير المقروءة (${unreadNotifications?.length || 0})
${
  unreadNotifications
    ?.map((n: any) => `- [${n.type}] ${n.title}: ${n.body?.substring(0, 80)}${n.body?.length > 80 ? "..." : ""}`)
    .join("\n") || "لا توجد إشعارات"
}

# تعليمات
- أجب باللغة العربية بشكل واضح، مفصّل، ومفيد
- استخدم المعلومات المتاحة لتقديم إجابات دقيقة وشخصية
- إذا سألوك عن إحصائيات محددة، استخدم البيانات المتاحة
- اقترح تحسينات بناءً على نشاط المستخدم
- إذا كانت المعلومة غير متوفرة، اعتذر بلطف واقترح بدائل
- ساعد في تلخيص المحادثات، تحليل النقاشات، اقتراح أفكار، والإجابة على الأسئلة
- كن ودوداً ومشجعاً، لكن صريحاً وموضوعياً
- عند الحديث عن الإحصائيات، قدم سياقاً وتفسيراً
`.trim()

    // بناء الـ prompt من المحادثة
    const conversationHistory = messages
      .map((msg: any) => `${msg.role === "user" ? "المستخدم" : "المساعد"}: ${msg.content}`)
      .join("\n")

    const fullPrompt = `${context}\n\nالمحادثة:\n${conversationHistory}\n\nالمساعد:`

    console.log("[v0] Generating AI response with comprehensive context...")
    const response = await generateAIText(fullPrompt)
    console.log("[v0] AI response generated successfully")

    return Response.json({ success: true, response })
  } catch (error) {
    console.error("[v0] Chat assistant error:", error)
    return Response.json(
      {
        error: "حدث خطأ أثناء معالجة طلبك. يرجى المحاولة مرة أخرى.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
