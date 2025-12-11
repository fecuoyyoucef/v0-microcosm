import { createClient } from "@/lib/supabase/server"
import { redirect, notFound } from "next/navigation"
import { ChatContainer } from "@/components/chat/chat-container"

interface PageProps {
  params: Promise<{ groupId: string }>
}

export default async function GroupChatPage({ params }: PageProps) {
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

  // جلب الـ profiles بشكل منفصل
  let members: any[] = []
  if (membersData && membersData.length > 0) {
    const userIds = membersData.map((m) => m.user_id)
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url, bio")
      .in("id", userIds)

    const profileMap = new Map(profiles?.map((p) => [p.id, p]) || [])
    members = membersData.map((m) => ({
      ...m,
      profile: profileMap.get(m.user_id) || null,
    }))
  }

  return (
    <ChatContainer
      groupId={groupId}
      group={membership.groups}
      currentUserId={user.id}
      members={members}
      currentUserRole={membership.role}
    />
  )
}
