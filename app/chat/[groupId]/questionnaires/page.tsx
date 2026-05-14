import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { QuestionnairesView } from "@/components/questionnaires/questionnaires-view"

export default async function QuestionnairesPage({
  params,
}: {
  params: Promise<{ groupId: string }>
}) {
  const { groupId } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  // Verify membership and resolve role in a single round-trip.
  const { data: membership } = await supabase
    .from("group_members")
    .select("role")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .maybeSingle()

  if (!membership) redirect(`/chat/${groupId}`)

  const isAdmin = membership.role === "admin"

  // Pull all questionnaires for the cell, newest first.
  const { data: questionnaires } = await supabase
    .from("cell_questionnaires")
    .select("id, title, description, status, created_at, created_by")
    .eq("group_id", groupId)
    .order("created_at", { ascending: false })

  // Resolve whether *this* user has already responded to each questionnaire,
  // so we can render "Answered" vs "Answer now" without an extra round-trip
  // per card on the client.
  const ids = (questionnaires ?? []).map((q) => q.id)
  let answeredIds = new Set<string>()
  if (ids.length > 0) {
    const { data: myResponses } = await supabase
      .from("cell_questionnaire_responses")
      .select("questionnaire_id")
      .eq("user_id", user.id)
      .in("questionnaire_id", ids)
    answeredIds = new Set((myResponses ?? []).map((r) => r.questionnaire_id))
  }

  // Total member count for showing "X / Y answered" in admin results.
  const { count: memberCount } = await supabase
    .from("group_members")
    .select("user_id", { count: "exact", head: true })
    .eq("group_id", groupId)

  const initialItems = (questionnaires ?? []).map((q) => ({
    ...q,
    answeredByMe: answeredIds.has(q.id),
  }))

  return (
    <QuestionnairesView
      groupId={groupId}
      isAdmin={isAdmin}
      currentUserId={user.id}
      memberCount={memberCount ?? 0}
      initialItems={initialItems}
    />
  )
}
