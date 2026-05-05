import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { verifyAdmin } from "@/lib/admin-auth"

export async function GET() {
  const admin = await verifyAdmin()
  if (!admin) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase.from("dev_notes").select("*").order("created_at", { ascending: false })

  if (error) {
    return NextResponse.json({ error: "فشل جلب الملاحظات" }, { status: 500 })
  }

  return NextResponse.json({ notes: data })
}

export async function POST(request: Request) {
  const admin = await verifyAdmin()
  if (!admin) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 })
  }

  const { content, status, priority } = await request.json()

  if (!content) {
    return NextResponse.json({ error: "المحتوى مطلوب" }, { status: 400 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("dev_notes")
    .insert({
      admin_id: admin.id,
      content,
      status: status || "pending",
      priority: priority || "normal",
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: "فشل إضافة الملاحظة" }, { status: 500 })
  }

  return NextResponse.json({ note: data })
}

export async function PATCH(request: Request) {
  const admin = await verifyAdmin()
  if (!admin) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 })
  }

  const { id, status, content } = await request.json()

  const supabase = await createClient()
  const { error } = await supabase
    .from("dev_notes")
    .update({ status, content, updated_at: new Date().toISOString() })
    .eq("id", id)

  if (error) {
    return NextResponse.json({ error: "فشل تحديث الملاحظة" }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

export async function DELETE(request: Request) {
  const admin = await verifyAdmin()
  if (!admin) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")

  if (!id) {
    return NextResponse.json({ error: "المعرف مطلوب" }, { status: 400 })
  }

  const supabase = await createClient()
  const { error } = await supabase.from("dev_notes").delete().eq("id", id)

  if (error) {
    return NextResponse.json({ error: "فشل حذف الملاحظة" }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
