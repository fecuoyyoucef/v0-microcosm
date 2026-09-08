import { createClient, createServiceClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const svc = createServiceClient()
  const { data: meeting } = await svc.from("meetings").select("id, group_id, status").eq("id", id).maybeSingle()
  if (!meeting) return NextResponse.json({ error: "Meeting not found" }, { status: 404 })

  const { data: membership } = await supabase.from("group_members").select("role").eq("group_id", meeting.group_id).eq("user_id", user.id).maybeSingle()
  if (membership?.role !== "admin") return NextResponse.json({ error: "فقط المسؤول يمكنه إنهاء الاجتماع" }, { status: 403 })
  if (meeting.status === "ended" || meeting.status === "cancelled") return NextResponse.json({ meeting })

  const { data, error } = await svc.from("meetings").update({ status: "ended", ended_sent_at: new Date().toISOString() }).eq("id", id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ meeting: data })
}
