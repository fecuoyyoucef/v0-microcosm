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

  const { data: existingReactions } = await supabase
    .from("message_reactions")
    .select()
    .eq("message_id", messageId)
    .eq("user_id", userId)

  if (existingReactions && existingReactions.length > 0) {
    const { error: deleteError } = await supabase
      .from("message_reactions")
      .delete()
      .eq("message_id", messageId)
      .eq("user_id", userId)

    if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 })

    const hadSameReaction = existingReactions.some((r) => r.reaction === reaction)
    if (hadSameReaction) {
      revalidatePath("/chat")
      return NextResponse.json({ success: true, action: "removed" })
    }
  }

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
