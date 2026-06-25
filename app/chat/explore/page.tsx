import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { ExploreContent } from "@/components/groups/explore-content"

export default async function ExplorePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // التحقق من وجود استبيان المستخدم
  const { data: survey } = await supabase
    .from("user_surveys")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle()

  return (
    <div className="flex-1 overflow-auto">
      <ExploreContent userId={user.id} hasSurvey={!!survey} />
    </div>
  )
}
