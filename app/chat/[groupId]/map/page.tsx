import { createClient } from "@/lib/supabase/server"
import { redirect, notFound } from "next/navigation"
import { ConversationMap } from "@/components/map/conversation-map"

interface PageProps {
  params: Promise<{ groupId: string }>
}

export default async function MapPage({ params }: PageProps) {
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

  // جلب العقد
  const { data: nodes } = await supabase
    .from("conversation_nodes")
    .select("*")
    .eq("group_id", groupId)
    .order("created_at", { ascending: true })

  // جلب عدد الرسائل لكل عقدة
  const { data: messageCounts } = await supabase
    .from("messages")
    .select("node_id")
    .eq("group_id", groupId)
    .not("node_id", "is", null)

  const nodeMessageCounts =
    messageCounts?.reduce(
      (acc, m) => {
        if (m.node_id) {
          acc[m.node_id] = (acc[m.node_id] || 0) + 1
        }
        return acc
      },
      {} as Record<string, number>,
    ) || {}

  const nodesWithCounts =
    nodes?.map((node) => ({
      ...node,
      messages_count: nodeMessageCounts[node.id] || 0,
    })) || []

  return <ConversationMap groupId={groupId} group={membership.groups} nodes={nodesWithCounts} currentUserId={user.id} />
}
