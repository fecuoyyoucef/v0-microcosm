import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { GroupsListPage } from "@/components/chat/groups-list-page"

export default async function ChatPage() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()

  if (error || !data.user) {
    redirect("/auth/login")
  }

  const user = data.user

  const { data: memberships } = await supabase.from("group_members").select("groups(*)").eq("user_id", user.id)

  const groups = memberships?.map((m) => m.groups).filter(Boolean) || []

  // Fetch profile
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  const { data: survey } = await supabase.from("user_surveys").select("*").eq("user_id", user.id).single()

  return <GroupsListPage groups={groups} userId={user.id} profile={profile} hasCompletedSurvey={!!survey} />
}
