import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const groupId = searchParams.get("groupId")

  if (!groupId) {
    return NextResponse.json({ error: "groupId required" }, { status: 400 })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Check membership
  const { data: membership } = await supabase
    .from("group_members")
    .select("role")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .single()

  if (!membership) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 })
  }

  const { data: questionnaires, error } = await supabase
    .from("cell_questionnaires")
    .select(
      `
      id, title, description, status, created_at,
      cell_questionnaire_questions(count),
      cell_questionnaire_responses(count)
    `
    )
    .eq("group_id", groupId)
    .order("created_at", { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ questionnaires })
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { group_id, title, description, questions } = body

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Check if user is admin
  const { data: membership } = await supabase
    .from("group_members")
    .select("role")
    .eq("group_id", group_id)
    .eq("user_id", user.id)
    .single()

  if (!membership || membership.role !== "admin") {
    return NextResponse.json({ error: "Only admins can create questionnaires" }, { status: 403 })
  }

  // Create questionnaire
  const { data: questionnaire, error: qError } = await supabase
    .from("cell_questionnaires")
    .insert({
      group_id,
      created_by: user.id,
      title,
      description,
      status: "open",
    })
    .select()
    .single()

  if (qError) {
    return NextResponse.json({ error: qError.message }, { status: 500 })
  }

  // Insert questions
  if (questions && questions.length > 0) {
    const questionsData = questions.map((q: any, idx: number) => ({
      questionnaire_id: questionnaire.id,
      question_text: q.question_text,
      question_type: q.question_type,
      options: q.options || null,
      sort_order: idx,
    }))

    const { error: qsError } = await supabase.from("cell_questionnaire_questions").insert(questionsData)

    if (qsError) {
      return NextResponse.json({ error: qsError.message }, { status: 500 })
    }
  }

  return NextResponse.json({ questionnaire }, { status: 201 })
}
