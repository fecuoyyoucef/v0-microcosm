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

    // Fetch all users with their profiles
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) throw error

    // Get user emails from auth.users
    const { data: authUsers } = await supabase.auth.admin.listUsers()

    // Merge profiles with emails
    const users = profiles.map((profile) => {
      const authUser = authUsers?.users?.find((u) => u.id === profile.id)
      return {
        ...profile,
        email: authUser?.email || "",
      }
    })

    return NextResponse.json({ users })
  } catch (error) {
    console.error("Error fetching users:", error)
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 })
  }
}
