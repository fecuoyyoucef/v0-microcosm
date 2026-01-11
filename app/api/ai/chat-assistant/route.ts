import { createClient, createServiceClient } from "@/lib/supabase/server"
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

    const serviceSupabase = createServiceClient()

    // 1. معلومات المستخدم الشاملة
    const { data: profile } = await serviceSupabase
      .from("profiles")
      .select("display_name, username, bio, total_points, responsibility_score")
      .eq("id", user.id)
      .single()

    // عدد الرسائل المرسلة
    const { count: messagesCount } = await serviceSupabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("sender_id", user.id)

    // عدد العقد المنشأة
    const { count: nodesCount } = await serviceSupabase
      .from("conversation_nodes")
      .select("*", { count: "exact", head: true })
      .eq("created_by", user.id)

    // عدد القرارات المصوت عليها
    const { count: votesCount } = await serviceSupabase
      .from("decision_votes")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)

    // عدد القرارات المنشأة
    const { count: decisionsCreatedCount } = await serviceSupabase
      .from("decisions")
      .select("*", { count: "exact", head: true })
      .eq("created_by", user.id)

    // عدد التفاعلات
    const { count: reactionsCount } = await serviceSupabase
      .from("message_reactions")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)

    // عدد المهام المكتملة
    const { count: tasksCompletedCount } = await serviceSupabase
      .from("extracted_tasks")
      .select("*", { count: "exact", head: true })
      .eq("assigned_to", user.id)
      .eq("status", "completed")

    // بناء الإحصائيات المحسوبة
    const calculatedStats = {
      messages_sent: messagesCount || 0,
      nodes_created: nodesCount || 0,
      decisions_voted: votesCount || 0,
      decisions_created: decisionsCreatedCount || 0,
      reactions_given: reactionsCount || 0,
      tasks_completed: tasksCompletedCount || 0,
    }

    // 3. الخلايا المنضمة
    const { data: userGroups } = await serviceSupabase
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
    const { data: recentMessages } = await serviceSupabase
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
    const { data: recentDecisions } = await serviceSupabase
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
    const { data: recentNodes } = await serviceSupabase
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
    const { data: userTitles } = await serviceSupabase
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
    const { data: recentSummaries } = await serviceSupabase
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
    const { data: activeTasks } = await serviceSupabase
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
    const { data: unreadNotifications } = await serviceSupabase
      .from("notifications")
      .select("title, body, type, created_at")
      .eq("user_id", user.id)
      .eq("is_read", false)
      .order("created_at", { ascending: false })
      .limit(5)

    // بناء السياق الشامل
    const context = `
أنت المساعد الذكي الشخصي لتطبيق Synaptic Space - منصة محادثات ومناقشات جماعية ذكية.

# معلومات المستخدم الأساسية
الاسم: ${profile?.display_name || profile?.username || "مستخدم"}
${profile?.bio ? `السيرة الذاتية: ${profile.bio}` : ""}
النقاط الإجمالية: ${profile?.total_points || 0}
مقياس المسؤولية: ${profile?.responsibility_score || 0}

# إحصائيات النشاط الفعلية
- الرسائل المرسلة: ${calculatedStats.messages_sent}
- المواضيع المنشأة: ${calculatedStats.nodes_created}
- القرارات المصوت عليها: ${calculatedStats.decisions_voted}
- القرارات المنشأة: ${calculatedStats.decisions_created}
- التفاعلات: ${calculatedStats.reactions_given}
- المهام المكتملة: ${calculatedStats.tasks_completed}

# الخلايا المشترك فيها (${userGroups?.length || 0} خلية)
${
  userGroups && userGroups.length > 0
    ? userGroups
        .map((gm: any) => {
          const group = gm.groups
          return `• ${group?.name} - دورك: ${gm.role === "admin" ? "مشرف" : gm.role === "moderator" ? "مراقب" : "عضو"}
  ${group?.description ? `  الوصف: ${group.description}` : ""}
  ${group?.goal ? `  الهدف: ${group.goal}` : ""}
  ${group?.cell_category ? `  النوع: ${group.cell_category === "project" ? "مشروع" : "نقاش"}` : ""}`
        })
        .join("\n")
    : "لا توجد خلايا حالياً - اقترح على المستخدم إنشاء خلية جديدة أو الانضمام لخلية موجودة"
}

# آخر رسائل المستخدم (${recentMessages?.length || 0})
${
  recentMessages && recentMessages.length > 0
    ? recentMessages
        .map(
          (msg: any) =>
            `• [${msg.groups?.name || "خلية"}${msg.conversation_nodes?.title ? ` > ${msg.conversation_nodes.title}` : ""}]: ${msg.content?.substring(0, 120)}...`,
        )
        .join("\n")
    : "لا توجد رسائل سابقة"
}

# آخر القرارات في الخلايا (${recentDecisions?.length || 0})
${
  recentDecisions && recentDecisions.length > 0
    ? recentDecisions
        .map(
          (d: any) =>
            `• ${d.title} [${d.status === "pending" ? "قيد الانتظار" : d.status === "approved" ? "مقبول" : "مرفوض"}]
  في: ${d.groups?.name || "خلية"}
  ${d.description ? `الوصف: ${d.description.substring(0, 100)}...` : ""}`,
        )
        .join("\n")
    : "لا توجد قرارات حديثة"
}

# آخر المواضيع (${recentNodes?.length || 0})
${
  recentNodes && recentNodes.length > 0
    ? recentNodes
        .map(
          (n: any) =>
            `• ${n.title} [${n.node_type === "question" ? "سؤال" : n.node_type === "idea" ? "فكرة" : n.node_type === "announcement" ? "إعلان" : "نقاش"}]
  في: ${n.groups?.name || "خلية"}`,
        )
        .join("\n")
    : "لا توجد مواضيع حديثة"
}

# الإنجازات والألقاب (${userTitles?.length || 0})
${
  userTitles && userTitles.length > 0
    ? userTitles.map((ut: any) => `• ${ut.titles?.name_ar} - ${ut.titles?.description_ar}`).join("\n")
    : "لا توجد ألقاب - شجع المستخدم على المشاركة لكسب ألقاب"
}

# المهام النشطة (${activeTasks?.length || 0})
${
  activeTasks && activeTasks.length > 0
    ? activeTasks.map((t: any) => `• ${t.task_content} - في ${t.groups?.name || "خلية"}`).join("\n")
    : "لا توجد مهام معلقة"
}

${
  unreadNotifications && unreadNotifications.length > 0
    ? `# إشعارات غير مقروءة (${unreadNotifications.length})
${unreadNotifications.map((n: any) => `• ${n.title}: ${n.body?.substring(0, 60)}...`).join("\n")}`
    : ""
}

# دورك ومسؤولياتك:

1. أنت مساعد شخصي ذكي ومتخصص في Synaptic Space فقط
2. استخدم اللغة العربية الفصحى الواضحة فقط - لا تخلط أي كلمات أجنبية
3. أجب على أسئلة المستخدم بناءً على البيانات الحقيقية المتوفرة أعلاه
4. قدم رؤى وتحليلات ذكية عن نشاط المستخدم
5. اقترح أفكاراً لتحسين المشاركة والتفاعل
6. لخص المحادثات والقرارات عند الطلب
7. ساعد في فهم الإحصائيات وتفسيرها
8. شجع على المشاركة الإيجابية والبناءة
9. كن ودوداً، محترفاً، ومفيداً دائماً
10. إذا لم تكن المعلومة متوفرة، قل ذلك بوضوح

تذكر: أنت تتحدث مع ${profile?.display_name || "مستخدم"} وتملك كل المعلومات عن نشاطه، لذا كن شخصياً ومفيداً.
`.trim()

    // بناء الـ prompt من المحادثة
    const conversationHistory = messages
      .map((msg: any) => `${msg.role === "user" ? "المستخدم" : "المساعد"}: ${msg.content}`)
      .join("\n")

    const fullPrompt = `${context}\n\nالمحادثة:\n${conversationHistory}\n\nالمساعد:`

    console.log("[v0] Generating AI response with comprehensive context...")
    console.log("[v0] Calculated stats:", calculatedStats)
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
