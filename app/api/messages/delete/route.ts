import { requireUser } from "@/lib/api-auth"
import { NextResponse } from "next/server"
import { revalidatePath } from "next/cache"

export async function DELETE(request: Request) {
  const { supabase, user, response } = await requireUser()
  if (response) return response

  const { messageId } = await request.json()
  if (!messageId) return NextResponse.json({ error: "Message ID required" }, { status: 400 })

  const { data: message, error: lookupError } = await supabase
    .from("messages")
    .select("sender_id")
    .eq("id", messageId)
    .maybeSingle()
  if (lookupError) return NextResponse.json({ error: "Unable to load message" }, { status: 500 })
  if (!message) return NextResponse.json({ error: "Message not found" }, { status: 404 })
  if (message.sender_id !== user!.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { error } = await supabase.from("messages").delete().eq("id", messageId).eq("sender_id", user!.id)
  if (error) return NextResponse.json({ error: "Unable to delete message" }, { status: 500 })
  revalidatePath("/chat")
  return NextResponse.json({ success: true })
}
