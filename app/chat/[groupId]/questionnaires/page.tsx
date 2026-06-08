import { createClient } from "@/lib/supabase/server"
import { notFound, redirect } from "next/navigation"
import { QuestionnairesContainer } from "@/components/questionnaires/questionnaires-container"

export const metadata = {
  title: "الاستبيانات",
}

interface Params {
  groupId: string
}

export default async function QuestionnairesPage(props: { params: Promise<Params> }) {
  const params = await props.params
  const { groupId } = params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  // Check if user is member of group
  const { data: membership } = await supabase
    .from("group_members")
    .select("role")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .single()

  if (!membership) notFound()

  // Fetch questionnaires
  const { data: questionnaires } = await supabase
    .from("cell_questionnaires")
    .select(
      `
      id, title, description, status, created_at, created_by,
      cell_questionnaire_questions(count),
      cell_questionnaire_responses(count)
    `
    )
    .eq("group_id", groupId)
    .order("created_at", { ascending: false })

  return (
    <QuestionnairesContainer
      groupId={groupId}
      userId={user.id}
      isAdmin={membership.role === "admin"}
      initialQuestionnaires={questionnaires || []}
    />
  )
}
