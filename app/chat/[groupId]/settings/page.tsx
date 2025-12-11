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

  const { data: membership } = await supabase
    .from("group_members")
    .select("*, groups(*)")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .single()

  // If not a member, check if user is a supervisor for this group
  let isSupervisor = false
  let groupData = membership?.groups

  if (!membership) {
    // Check if user is a supervisor
    const { data: supervisor } = await supabase
      .from("group_supervisors")
      .select("*, groups(*)")
      .eq("group_id", groupId)
      .eq("user_id", user.id)
      .single()

    if (supervisor) {
      isSupervisor = true
      groupData = supervisor.groups
    } else {
      // Also check if user is admin of parent group
      const { data: group } = await supabase
        .from("groups")
        .select("*, parent:parent_group_id(*)")
        .eq("id", groupId)
        .single()

      if (group?.parent_group_id) {
        const { data: parentMembership } = await supabase
          .from("group_members")
          .select("role")
          .eq("group_id", group.parent_group_id)
          .eq("user_id", user.id)
          .single()

        if (parentMembership?.role === "admin") {
          isSupervisor = true
          groupData = group
        }
      }
    }

    if (!isSupervisor) {
      notFound()
    }
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

  const isAdmin = membership?.role === "admin" || isSupervisor

  return <GroupSettingsForm group={groupData} members={members} currentUserId={user.id} isAdmin={isAdmin} />
}
