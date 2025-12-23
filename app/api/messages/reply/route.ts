import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { revalidatePath } from "next/cache"

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: () => {},
    },
  })

  const { messageId, content, senderId, groupId } = await request.json()

  if (!messageId || !content || !senderId || !groupId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  const { data, error } = await supabase
    .from("messages")
    .insert({
      group_id: groupId,
      sender_id: senderId,
      content,
      reply_to: messageId,
      layer: "standard",
      created_at: new Date().toISOString(),
    })
    .select()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  revalidatePath("/chat")

  return NextResponse.json({ data, success: true })
}
