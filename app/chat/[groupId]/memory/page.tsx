import { createClient, createServiceClient } from "@/lib/supabase/server"
import { redirect, notFound } from "next/navigation"
import { CollectiveMemoryContainer } from "@/components/memory/collective-memory-container"
import { generateDailySummaryForGroup } from "@/lib/memory/generate-daily-summary"

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

  // Lazy daily-summary trigger.
  //
  // Vercel cron only runs on production deployments at 00:00 UTC. Without
  // this fallback the feature looks broken in dev/preview and on fresh
  // production deployments until the first scheduled run. Generating on
  // visit is safe because `generateDailySummaryForGroup` short-circuits
  // once today's summary exists (idempotent upsert keyed by
  // group_id + summary_date). We use the service client so RLS does not
  // block the insert, and we await it so the user sees the summary
  // immediately rather than on a second refresh.
  const today = new Date().toISOString().split("T")[0]
  const { data: todayMemory } = await supabase
    .from("collective_memory")
    .select("id")
    .eq("group_id", groupId)
    .eq("summary_date", today)
    .maybeSingle()

  if (!todayMemory) {
    try {
      const service = createServiceClient()
      await generateDailySummaryForGroup(service, groupId)
    } catch (e) {
      // Never block the page on AI/network errors — the UI still works
      // with whatever summaries already exist.
      console.error("[Memory] Lazy summary generation failed:", e)
    }
  }

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
