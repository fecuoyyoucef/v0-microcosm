import { createClient } from "@/lib/supabase/server"
import { redirect, notFound } from "next/navigation"
import { GroupSettingsForm } from "@/components/chat/group-settings-form"

interface PageProps {
  params: Promise<{ groupId: string }>
}

export default async function GroupSettingsPage({ params }: PageProps) {
  const { groupId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // التحقق من أن المستخدم عضو في المجموعة
  const { data: membership } = await supabase
    .from("group_members")
    .select("*, groups(*)")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .single()

  if (!membership) {
    notFound()
  }

  const { data: membersData } = await supabase.from("group_members").select("*").eq("group_id", groupId)

  // Fetch profiles separately
  const memberUserIds = membersData?.map((m) => m.user_id) || []
  const { data: profilesData } = await supabase.from("profiles").select("*").in("id", memberUserIds)

  // Merge members with profiles
  const members =
    membersData?.map((member) => ({
      ...member,
      profile: profilesData?.find((p) => p.id === member.user_id) || null,
    })) || []

  return (
    <GroupSettingsForm
      group={membership.groups}
      members={members}
      currentUserId={user.id}
      isAdmin={membership.role === "admin"}
    />
  )
}
