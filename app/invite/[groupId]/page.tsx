import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { InviteHandler } from "@/components/invite-handler"

interface PageProps {
  params: Promise<{ groupId: string }>
}

export default async function InvitePage({ params }: PageProps) {
  const { groupId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // جلب معلومات المجموعة
  const { data: group } = await supabase.from("groups").select("*").eq("id", groupId).single()

  if (!group) {
    redirect("/")
  }

  // إذا كان المستخدم مسجل، تحقق من العضوية
  if (user) {
    const { data: membership } = await supabase
      .from("group_members")
      .select("*")
      .eq("group_id", groupId)
      .eq("user_id", user.id)
      .single()

    if (membership) {
      // المستخدم عضو بالفعل
      redirect(`/chat/${groupId}`)
    }
  }

  return <InviteHandler group={group} isLoggedIn={!!user} />
}
