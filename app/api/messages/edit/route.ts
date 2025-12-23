import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { revalidatePath } from "next/cache"

export async function PUT(request: Request) {
  const cookieStore = await cookies()
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: () => {},
    },
  })

  const { messageId, content, senderId } = await request.json()

  if (!messageId || !content) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  // Check if user is message sender
  const { data: message } = await supabase.from("messages").select("sender_id").eq("id", messageId).single()

  if (message?.sender_id !== senderId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  const { data, error } = await supabase
    .from("messages")
    .update({
      content,
      updated_at: new Date().toISOString(),
    })
    .eq("id", messageId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  revalidatePath("/chat")
  return NextResponse.json({ data, success: true })
}
