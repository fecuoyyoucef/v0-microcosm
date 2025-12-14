import { createClient } from "@/lib/supabase/server"
import { redirect, notFound } from "next/navigation"
import { ExpandedProfile } from "@/components/profile/expanded-profile"

export default async function UserProfilePage({ params }: { params: { userId: string } }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // التحقق من وجود المستخدم
  const { data: targetUser } = await supabase.from("profiles").select("id").eq("id", params.userId).single()

  if (!targetUser) {
    notFound()
  }

  return (
    <div className="flex-1 overflow-auto">
      <ExpandedProfile userId={params.userId} viewerId={user.id} />
    </div>
  )
}
