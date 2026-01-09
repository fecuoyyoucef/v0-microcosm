import type React from "react"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { AppShell } from "@/components/layout/app-shell"
import { InstallPromptNotification } from "@/components/pwa/install-button"

export default async function ChatLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    redirect("/auth/login")
  }

  // Fetch user profile
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  // Fetch user's groups
  const { data: memberships } = await supabase.from("group_members").select("groups(*)").eq("user_id", user.id)

  const groups = memberships?.map((m) => m.groups).filter(Boolean) || []

  return (
    <>
      <InstallPromptNotification />
      <AppShell userId={user.id} profile={profile} groups={groups as any}>
        {children}
      </AppShell>
    </>
  )
}
