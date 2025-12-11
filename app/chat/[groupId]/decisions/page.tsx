import { createClient } from "@/lib/supabase/server"
import { redirect, notFound } from "next/navigation"
import { DecisionsContainer } from "@/components/decisions/decisions-container"

interface PageProps {
  params: Promise<{ groupId: string }>
}

export default async function DecisionsPage({ params }: PageProps) {
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

  if (!membership) {
    notFound()
  }

  const { data: decisions } = await supabase
    .from("decisions")
    .select("*")
    .eq("group_id", groupId)
    .order("created_at", { ascending: false })

  const { data: members } = await supabase.from("group_members").select("user_id").eq("group_id", groupId)

  return (
    <DecisionsContainer
      groupId={groupId}
      group={membership.groups}
      decisions={decisions || []}
      currentUserId={user.id}
      memberCount={members?.length || 0}
    />
  )
}
