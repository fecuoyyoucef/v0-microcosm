import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Get questionnaire with questions
  const { data: questionnaire, error } = await supabase
    .from("cell_questionnaires")
    .select("*, cell_questionnaire_questions(*)")
    .eq("id", id)
    .single()

  if (error || !questionnaire) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  // Check membership
  const { data: membership } = await supabase
    .from("group_members")
    .select("role")
    .eq("group_id", questionnaire.group_id)
    .eq("user_id", user.id)
    .single()

  if (!membership) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 })
  }

  // Check if user already responded
  const { data: userResponse } = await supabase
    .from("cell_questionnaire_responses")
    .select("id")
    .eq("questionnaire_id", id)
    .eq("user_id", user.id)
    .single()

  // Get results for admin
  let results = null
  if (membership.role === "admin") {
    const { data: responses } = await supabase
      .from("cell_questionnaire_responses")
      .select("*, cell_questionnaire_answers(*)")
      .eq("questionnaire_id", id)

    if (responses) {
      const totalResponses = responses.length
      const { count: totalMembers } = await supabase
        .from("group_members")
        .select("*", { count: "exact", head: true })
        .eq("group_id", questionnaire.group_id)

      const questionResults = questionnaire.cell_questionnaire_questions?.map((q: any) => {
        const answers = responses.flatMap((r) => r.cell_questionnaire_answers.filter((a: any) => a.question_id === q.id))

        if (q.question_type === "short_text") {
          return {
            question_id: q.id,
            question_text: q.question_text,
            question_type: "short_text",
            answers: answers.map((a: any) => a.answer_text),
          }
        } else {
          const choiceCounts: Record<string, number> = {}
          answers.forEach((a: any) => {
            choiceCounts[a.answer_choice] = (choiceCounts[a.answer_choice] || 0) + 1
          })

          return {
            question_id: q.id,
            question_text: q.question_text,
            question_type: "single_choice",
            choiceCounts,
          }
        }
      })

      results = {
        totalResponses,
        totalMembers: totalMembers || 0,
        questionResults,
      }
    }
  }

  return NextResponse.json({
    questionnaire,
    userResponse: userResponse || null,
    results,
  })
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: questionnaire } = await supabase
    .from("cell_questionnaires")
    .select("group_id, created_by")
    .eq("id", id)
    .single()

  if (!questionnaire) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  // Check if admin
  const { data: membership } = await supabase
    .from("group_members")
    .select("role")
    .eq("group_id", questionnaire.group_id)
    .eq("user_id", user.id)
    .single()

  if (!membership || membership.role !== "admin") {
    return NextResponse.json({ error: "Only admins can delete" }, { status: 403 })
  }

  const { error } = await supabase.from("cell_questionnaires").delete().eq("id", id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
