import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function DELETE() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Delete in reverse order of dependencies
    const userId = user.id

    // Delete group memberships
    await supabase.from("group_members").delete().eq("user_id", userId)

    // Delete messages
    await supabase.from("messages").delete().eq("user_id", userId)

    // Delete decisions
    await supabase.from("decisions").delete().eq("created_by", userId)

    // Delete notifications
    await supabase.from("notifications").delete().eq("user_id", userId)

    // Delete profile
    await supabase.from("profiles").delete().eq("id", userId)

    const { error: deleteError } = await supabase.auth.admin.deleteUser(userId)

    if (deleteError) {
      console.error("Error deleting user:", deleteError)
      return NextResponse.json({ error: "Failed to delete account" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in delete account:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
