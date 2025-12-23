import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { revalidatePath } from "next/cache"

export async function DELETE(request: Request) {
  const cookieStore = await cookies()
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: () => {},
    },
  })

  const { messageId, senderId } = await request.json()

  if (!messageId) {
    return NextResponse.json({ error: "Message ID required" }, { status: 400 })
  }

  // Check if user is message sender
  const { data: message } = await supabase.from("messages").select("sender_id").eq("id", messageId).single()

  if (message?.sender_id !== senderId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  const { error } = await supabase.from("messages").delete().eq("id", messageId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  revalidatePath("/chat")
  return NextResponse.json({ success: true })
}
