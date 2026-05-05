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

  const { messageId, userId, groupId } = await request.json()

  if (!messageId || !userId || !groupId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  const { data: group } = await supabase.from("groups").select("owner_id").eq("id", groupId).single()

  // Check if user is owner or admin
  const { data: member } = await supabase
    .from("group_members")
    .select("role")
    .eq("group_id", groupId)
    .eq("user_id", userId)
    .single()

  const isOwner = group?.owner_id === userId
  const isAdmin = member?.role === "admin" || member?.role === "moderator"

  if (!group || (!isOwner && !isAdmin)) {
    return NextResponse.json({ error: "فقط مالك الخلية أو المشرفين يمكنهم تثبيت الرسائل" }, { status: 403 })
  }

  const { data: currentMessage } = await supabase.from("messages").select("is_pinned").eq("id", messageId).single()

  const newPinStatus = !currentMessage?.is_pinned

  const { data, error } = await supabase
    .from("messages")
    .update({
      is_pinned: newPinStatus,
      pinned_at: newPinStatus ? new Date().toISOString() : null,
      pinned_by: newPinStatus ? userId : null,
    })
    .eq("id", messageId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  revalidatePath("/chat")

  return NextResponse.json({ data, success: true, pinned: newPinStatus })
}
