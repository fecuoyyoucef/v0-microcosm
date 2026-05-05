import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { verifyAdmin } from "@/lib/admin-auth"

export async function GET() {
  const admin = await verifyAdmin()
  if (!admin) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 })
  }

  try {
    const supabase = await createClient()

    const { data: logs } = await supabase
      .from("system_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200)

    return NextResponse.json({ logs: logs || [] })
  } catch (error) {
    console.error("Logs error:", error)
    return NextResponse.json({ logs: [] })
  }
}
