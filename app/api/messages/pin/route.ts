import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function PUT(request: Request) {
  const cookieStore = cookies()
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: () => {},
    },
  })

  const { messageId, userId, isPinned } = await request.json()

  if (!messageId || userId === undefined) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  const { data, error } = await supabase
    .from("messages")
    .update({
      is_pinned: isPinned,
      pinned_at: isPinned ? new Date().toISOString() : null,
      pinned_by: isPinned ? userId : null,
    })
    .eq("id", messageId)
    .select()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
