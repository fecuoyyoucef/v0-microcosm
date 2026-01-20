import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { OpenDevinDashboard } from "@/components/opendevin/dashboard"

export default async function OpenDevinPage() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect("/auth/login")
  }

  // Check if user is admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profile?.role !== "admin") {
    redirect("/chat")
  }

  // Get recent tasks
  const { data: tasks } = await supabase
    .from("opendevin_tasks")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50)

  return <OpenDevinDashboard initialTasks={tasks || []} userId={user.id} />
}
