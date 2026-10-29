import { requireUser } from "@/lib/api-auth"
import { NextResponse } from "next/server"
import { revalidatePath } from "next/cache"

const allowedReactions = new Set(["like", "love", "laugh", "wow", "sad", "angry"])

export async function POST(request: Request) {
  const { supabase, user, response } = await requireUser()
  if (response) return response
  const { messageId, reaction } = await request.json()
  if (!messageId || typeof reaction !== "string" || !allowedReactions.has(reaction)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }
  const { data: message } = await supabase.from("messages").select("group_id").eq("id", messageId).maybeSingle()
  if (!message) return NextResponse.json({ error: "Message not found" }, { status: 404 })
  const { data: member } = await supabase.from("group_members").select("user_id").eq("group_id", message.group_id).eq("user_id", user!.id).maybeSingle()
  if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { data: existingReactions } = await supabase.from("message_reactions").select("id, reaction").eq("message_id", messageId).eq("user_id", user!.id)
  if (existingReactions?.length) {
    await supabase.from("message_reactions").delete().eq("message_id", messageId).eq("user_id", user!.id)
    if (existingReactions.some((item) => item.reaction === reaction)) {
      revalidatePath("/chat")
      return NextResponse.json({ success: true, action: "removed" })
    }
  }
  const { data, error } = await supabase.from("message_reactions").insert({ message_id: messageId, user_id: user!.id, reaction }).select().single()
  if (error) return NextResponse.json({ error: "Unable to save reaction" }, { status: 500 })
  revalidatePath("/chat")
  return NextResponse.json({ success: true, action: "added", reactionId: data.id })
}
