import { requireUser } from "@/lib/api-auth"
import { type NextRequest, NextResponse } from "next/server"

export async function GET() {
  const { supabase, user, response } = await requireUser()
  if (response) return response
  const { data, error } = await supabase.from("notifications").select("*").eq("user_id", user!.id).order("created_at", { ascending: false }).limit(100)
  if (error) return NextResponse.json({ error: "Unable to load notifications" }, { status: 500 })
  return NextResponse.json({ notifications: data })
}

export async function POST(request: NextRequest) {
  const { supabase, user, response } = await requireUser()
  if (response) return response
  const body = await request.json()
  const { notificationId, markAllRead } = body
  if (markAllRead) {
    const { error } = await supabase.from("notifications").update({ is_read: true, read_at: new Date().toISOString() }).eq("user_id", user!.id).eq("is_read", false)
    if (error) return NextResponse.json({ error: "Unable to update notifications" }, { status: 500 })
    return NextResponse.json({ success: true })
  }
  if (!notificationId) return NextResponse.json({ error: "Notification ID required" }, { status: 400 })
  const { error } = await supabase.from("notifications").update({ is_read: true, read_at: new Date().toISOString() }).eq("id", notificationId).eq("user_id", user!.id)
  if (error) return NextResponse.json({ error: "Unable to update notification" }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function DELETE(request: NextRequest) {
  const { supabase, user, response } = await requireUser()
  if (response) return response
  const { searchParams } = new URL(request.url)
  const deleteRead = searchParams.get("deleteRead") === "true"
  const notificationId = searchParams.get("id")
  let query = supabase.from("notifications").delete().eq("user_id", user!.id)
  if (deleteRead) query = query.eq("is_read", true)
  else if (notificationId) query = query.eq("id", notificationId)
  else return NextResponse.json({ error: "Notification ID required" }, { status: 400 })
  const { error } = await query
  if (error) return NextResponse.json({ error: "Unable to delete notification" }, { status: 500 })
  return NextResponse.json({ success: true })
}
