import { createClient } from "@/lib/supabase/server"
import { redirect, notFound } from "next/navigation"
import { JoinRequestsManager } from "@/components/groups/join-requests-manager"

interface PageProps {
  params: Promise<{ groupId: string }>
}

export default async function JoinRequestsPage({ params }: PageProps) {
  const { groupId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Check if user is admin of this group
  const { data: membership } = await supabase
    .from("group_members")
    .select("role")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .single()

  if (membership?.role !== "admin") {
    notFound()
  }

  // Get all pending join requests
  const { data: joinRequests } = await supabase
    .from("group_join_requests")
    .select("*, profiles:user_id(id, display_name, avatar_url, bio)")
    .eq("group_id", groupId)
    .eq("status", "pending")
    .order("created_at", { ascending: false })

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">طلبات الانضمام</h1>
      <JoinRequestsManager groupId={groupId} initialRequests={joinRequests || []} />
    </div>
  )
}
