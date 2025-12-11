import type React from "react"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { ChatSidebar } from "@/components/chat/chat-sidebar"
import { PushNotificationManager } from "@/components/notifications/push-notification-manager"
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

  return (
    <div className="flex h-[100dvh] bg-background overflow-hidden">
      <PushNotificationManager userId={user.id} />
      <InstallPromptNotification />

      {/* Sidebar - hidden on mobile, visible on desktop */}
      <aside className="hidden md:flex md:w-72 lg:w-80 border-l border-border bg-card flex-col shrink-0">
        <ChatSidebar userId={user.id} />
      </aside>

      {/* Main content area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile swipe sidebar - no header bar */}
        <ChatSidebar userId={user.id} mobileOnly />

        <div className="flex-1 flex flex-col overflow-hidden">{children}</div>
      </main>
    </div>
  )
}
