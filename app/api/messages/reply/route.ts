import { requireGroupMember } from "@/lib/api-auth"
import { NextResponse } from "next/server"
import { revalidatePath } from "next/cache"

export async function POST(request: Request) {
  const { supabase, user, response } = await requireGroupMemberFromRequest(request)
  if (response) return response

  const { messageId, content, groupId } = await request.json()
  if (!messageId || typeof content !== "string" || !content.trim() || !groupId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }
  const message = await supabase.from("messages").select("id, group_id").eq("id", messageId).maybeSingle()
  if (message.error) return NextResponse.json({ error: "Unable to load message" }, { status: 500 })
  if (!message.data || message.data.group_id !== groupId) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { data, error } = await supabase.from("messages").insert({
    group_id: groupId,
    sender_id: user!.id,
    content: content.trim(),
    reply_to: messageId,
    layer: "standard",
    created_at: new Date().toISOString(),
  }).select()
  if (error) return NextResponse.json({ error: "Unable to create reply" }, { status: 500 })
  revalidatePath("/chat")
  return NextResponse.json({ data, success: true })
}

async function requireGroupMemberFromRequest(request: Request) {
  const body = await request.clone().json()
  if (!body.groupId) return { ...(await requireGroupMember("")), response: NextResponse.json({ error: "Missing required fields" }, { status: 400 }) }
  return requireGroupMember(body.groupId)
}
