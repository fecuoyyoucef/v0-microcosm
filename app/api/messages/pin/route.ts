import { isGroupModerator, requireGroupMember } from "@/lib/api-auth"
import { NextResponse } from "next/server"
import { revalidatePath } from "next/cache"

export async function POST(request: Request) {
  const body = await request.json()
  const { messageId, groupId } = body
  if (!messageId || !groupId) return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  const { supabase, user, member, response } = await requireGroupMember(groupId)
  if (response) return response

  const { data: group } = await supabase.from("groups").select("created_by").eq("id", groupId).maybeSingle()
  if (!group || (group.created_by !== user!.id && !isGroupModerator(member?.role))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  const { data: currentMessage } = await supabase.from("messages").select("is_pinned, group_id").eq("id", messageId).maybeSingle()
  if (!currentMessage || currentMessage.group_id !== groupId) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const newPinStatus = !currentMessage.is_pinned
  const { data, error } = await supabase.from("messages").update({
    is_pinned: newPinStatus,
    pinned_at: newPinStatus ? new Date().toISOString() : null,
    pinned_by: newPinStatus ? user!.id : null,
  }).eq("id", messageId).eq("group_id", groupId).select().single()
  if (error) return NextResponse.json({ error: "Unable to update message" }, { status: 500 })
  revalidatePath("/chat")
  return NextResponse.json({ data, success: true, pinned: newPinStatus })
}
