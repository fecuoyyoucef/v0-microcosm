import { createClient } from "@/lib/supabase/server"
import { redirect, notFound } from "next/navigation"
import { NotebookContainer } from "@/components/notebook/notebook-container"

interface PageProps {
  params: Promise<{ groupId: string }>
}

export default async function NotebookPage({ params }: PageProps) {
  const { groupId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // التحقق من العضوية
  const { data: membership } = await supabase
    .from("group_members")
    .select("*, groups(*)")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .single()

  if (!membership) {
    notFound()
  }

  // جلب صفحات المفكرة
  const { data: pages } = await supabase
    .from("notebook_pages")
    .select("*")
    .eq("group_id", groupId)
    .order("created_at", { ascending: true })

  // جلب الأعضاء
  const { data: members } = await supabase.from("group_members").select("*, profiles(*)").eq("group_id", groupId)

  return (
    <NotebookContainer
      groupId={groupId}
      group={membership.groups}
      pages={pages || []}
      members={members || []}
      currentUserId={user.id}
    />
  )
}
