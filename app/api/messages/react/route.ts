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

  const { messageId, userId, reaction } = await request.json()

  if (!messageId || !userId || !reaction) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  // Check if reaction already exists
  const { data: existing } = await supabase
    .from("message_reactions")
    .select()
    .eq("message_id", messageId)
    .eq("user_id", userId)
    .eq("reaction", reaction)
    .single()

  if (existing) {
    const { error } = await supabase.from("message_reactions").delete().eq("id", existing.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    revalidatePath("/chat")
    return NextResponse.json({ success: true, action: "removed" })
  } else {
    const { data, error } = await supabase
      .from("message_reactions")
      .insert({
        message_id: messageId,
        user_id: userId,
        reaction,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    revalidatePath("/chat")
    return NextResponse.json({ success: true, action: "added", reactionId: data.id })
  }
}
