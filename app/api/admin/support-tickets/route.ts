import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function GET() {
  const cookieStore = await cookies()
  const adminToken = cookieStore.get("admin_token")

  if (!adminToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const supabase = await createClient()

    // Try to fetch from support_tickets table if it exists
    const { data: tickets, error } = await supabase
      .from("support_tickets")
      .select(`
        *,
        profiles:user_id (display_name)
      `)
      .order("created_at", { ascending: false })
      .limit(50)

    if (error) {
      // Table might not exist yet, return empty array
      console.log("Support tickets table not found, returning empty array")
      return NextResponse.json({ tickets: [] })
    }

    const formattedTickets = tickets.map((ticket) => ({
      ...ticket,
      user_name: ticket.profiles?.display_name || "مستخدم",
    }))

    return NextResponse.json({ tickets: formattedTickets })
  } catch (error) {
    console.error("Error fetching support tickets:", error)
    return NextResponse.json({ tickets: [] })
  }
}
