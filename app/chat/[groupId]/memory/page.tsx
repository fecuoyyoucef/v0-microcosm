import { createClient } from "@/lib/supabase/server"
import { redirect, notFound } from "next/navigation"
import { CollectiveMemoryContainer } from "@/components/memory/collective-memory-container"

interface PageProps {
  params: Promise<{ groupId: string }>
}

export default async function MemoryPage({ params }: PageProps) {
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

  // Try to get from collective_memory first, fallback to daily_summaries
  const { data: memories } = await supabase
    .from("collective_memory")
    .select("*")
    .eq("group_id", groupId)
    .order("summary_date", { ascending: false })
    .limit(30)

  return (
    <CollectiveMemoryContainer
      groupId={groupId}
      group={membership.groups}
      memories={memories || []}
      currentUserId={user.id}
    />
  )
}
