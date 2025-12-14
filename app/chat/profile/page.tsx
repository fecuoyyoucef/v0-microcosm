import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { ExpandedProfile } from "@/components/profile/expanded-profile"

export default async function ProfilePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  return (
    <div className="flex-1 overflow-auto">
      <ExpandedProfile userId={user.id} />
    </div>
  )
}
