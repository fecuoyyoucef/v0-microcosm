import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await request.json()
  const { answers } = body

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Check if questionnaire is open and user is member
  const { data: questionnaire } = await supabase
    .from("cell_questionnaires")
    .select("status, group_id")
    .eq("id", id)
    .single()

  if (!questionnaire) {
    return NextResponse.json({ error: "Questionnaire not found" }, { status: 404 })
  }

  if (questionnaire.status !== "open") {
    return NextResponse.json({ error: "Questionnaire is closed" }, { status: 400 })
  }

  const { data: membership } = await supabase
    .from("group_members")
    .select("role")
    .eq("group_id", questionnaire.group_id)
    .eq("user_id", user.id)
    .single()

  if (!membership) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 })
  }

  // Check if already responded
  const { data: existingResponse } = await supabase
    .from("cell_questionnaire_responses")
    .select("id")
    .eq("questionnaire_id", id)
    .eq("user_id", user.id)
    .single()

  if (existingResponse) {
    return NextResponse.json({ error: "Already responded" }, { status: 400 })
  }

  // Create response
  const { data: response, error: respError } = await supabase
    .from("cell_questionnaire_responses")
    .insert({
      questionnaire_id: id,
      user_id: user.id,
    })
    .select()
    .single()

  if (respError) {
    return NextResponse.json({ error: respError.message }, { status: 500 })
  }

  // Insert answers
  const answersData = Object.entries(answers).map(([questionId, answer]: [string, any]) => ({
    response_id: response.id,
    question_id: questionId,
    answer_text: typeof answer === "string" ? answer : null,
    answer_choice: typeof answer === "string" ? answer : null,
  }))

  const { error: ansError } = await supabase.from("cell_questionnaire_answers").insert(answersData)

  if (ansError) {
    return NextResponse.json({ error: ansError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true }, { status: 201 })
}
