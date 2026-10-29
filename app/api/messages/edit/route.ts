import { requireUser } from "@/lib/api-auth"
import { NextResponse } from "next/server"
import { revalidatePath } from "next/cache"

export async function PUT(request: Request) {
  const { supabase, user, response } = await requireUser()
  if (response) return response

  const { messageId, content } = await request.json()
  if (!messageId || typeof content !== "string" || !content.trim()) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  const { data: message, error: lookupError } = await supabase
    .from("messages")
    .select("sender_id")
    .eq("id", messageId)
    .maybeSingle()
  if (lookupError) return NextResponse.json({ error: "Unable to load message" }, { status: 500 })
  if (!message) return NextResponse.json({ error: "Message not found" }, { status: 404 })
  if (message.sender_id !== user!.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { data, error } = await supabase
    .from("messages")
    .update({ content: content.trim(), updated_at: new Date().toISOString() })
    .eq("id", messageId)
    .eq("sender_id", user!.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: "Unable to update message" }, { status: 500 })
  revalidatePath("/chat")
  return NextResponse.json({ data, success: true })
}
