import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { ProfileManager } from "@/components/profile/profile-manager"

export default async function ProfilePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  return (
    <div className="flex-1 overflow-auto">
      <ProfileManager user={user} profile={profile} />
    </div>
  )
}
