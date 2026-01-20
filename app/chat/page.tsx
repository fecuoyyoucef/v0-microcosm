import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { HomePageContent } from "@/components/chat/home-page-content"

export default async function ChatPage() {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase.auth.getUser()

    if (error || !data.user) {
      console.log("[v0] User not authenticated, redirecting to login")
      redirect("/auth/login")
    }

    const user = data.user

    const { data: memberships, error: membershipError } = await supabase
      .from("group_members")
      .select("groups(*)")
      .eq("user_id", user.id)

    if (membershipError) {
      console.error("[v0] Error fetching memberships:", membershipError)
    }

    const groups = memberships?.map((m) => m.groups).filter(Boolean) || []

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single()

    if (profileError && profileError.code !== "PGRST116") {
      console.error("[v0] Error fetching profile:", profileError)
    }

    const { data: survey, error: surveyError } = await supabase
      .from("user_surveys")
      .select("*")
      .eq("user_id", user.id)
      .single()

    if (surveyError && surveyError.code !== "PGRST116") {
      console.error("[v0] Error fetching survey:", surveyError)
    }

    return <HomePageContent groups={groups as any} userId={user.id} profile={profile} hasCompletedSurvey={!!survey} />
  } catch (error) {
    console.error("[v0] ChatPage error:", error)
    throw error
  }
}
