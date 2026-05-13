import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * GET /api/questionnaires?groupId=...
 * List all questionnaires for a group (visible to members via RLS).
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const groupId = req.nextUrl.searchParams.get("groupId")
  if (!groupId) return NextResponse.json({ error: "groupId required" }, { status: 400 })

  const { data, error } = await supabase
    .from("cell_questionnaires")
    .select("*")
    .eq("group_id", groupId)
    .order("created_at", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Compute response_count + user_has_responded for each questionnaire
  const ids = (data ?? []).map((q: any) => q.id)
  let counts: Record<string, number> = {}
  let userResponded: Record<string, boolean> = {}

  if (ids.length > 0) {
    const { data: responses } = await supabase
      .from("cell_questionnaire_responses")
      .select("questionnaire_id, user_id")
      .in("questionnaire_id", ids)

    for (const r of responses ?? []) {
      counts[r.questionnaire_id] = (counts[r.questionnaire_id] ?? 0) + 1
      if (r.user_id === user.id) userResponded[r.questionnaire_id] = true
    }
  }

  const enriched = (data ?? []).map((q: any) => ({
    ...q,
    response_count: counts[q.id] ?? 0,
    user_has_responded: !!userResponded[q.id],
  }))

  return NextResponse.json({ questionnaires: enriched })
}

/**
 * POST /api/questionnaires
 * Body: { groupId, title, description?, questions: QuestionDraft[], anonymous?, allowMultiple?, closesAt? }
 * Only admins of the group can create (enforced by RLS).
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 })

  const { groupId, title, description, questions, anonymous, allowMultiple, closesAt } = body
  if (!groupId || !title?.trim()) {
    return NextResponse.json({ error: "groupId and title are required" }, { status: 400 })
  }

  // 1) Insert questionnaire (RLS will reject if user is not admin)
  const { data: questionnaire, error: insertErr } = await supabase
    .from("cell_questionnaires")
    .insert({
      group_id: groupId,
      created_by: user.id,
      title: title.trim(),
      description: description?.trim() || null,
      status: "draft",
      anonymous: !!anonymous,
      allow_multiple_responses: !!allowMultiple,
      closes_at: closesAt || null,
    })
    .select()
    .single()

  if (insertErr || !questionnaire) {
    return NextResponse.json({ error: insertErr?.message ?? "Failed to create" }, { status: 403 })
  }

  // 2) Insert questions if provided
  if (Array.isArray(questions) && questions.length > 0) {
    const rows = questions.map((q: any, idx: number) => ({
      questionnaire_id: questionnaire.id,
      question_text: String(q.question_text ?? "").trim(),
      question_type: q.question_type,
      options: Array.isArray(q.options) ? q.options.filter((o: string) => o?.trim()) : [],
      is_required: q.is_required !== false,
      position: typeof q.position === "number" ? q.position : idx,
    }))

    const { error: qErr } = await supabase.from("cell_questionnaire_questions").insert(rows)
    if (qErr) {
      // Roll back the questionnaire
      await supabase.from("cell_questionnaires").delete().eq("id", questionnaire.id)
      return NextResponse.json({ error: qErr.message }, { status: 500 })
    }
  }

  return NextResponse.json({ questionnaire })
}
