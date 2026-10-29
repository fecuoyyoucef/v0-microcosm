import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function requireUser() {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()

  if (error || !data.user) {
    return { supabase, user: null, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  }

  return { supabase, user: data.user, response: null }
}

export async function requireGroupMember(groupId: string) {
  const auth = await requireUser()
  if (!auth.user) return { ...auth, member: null }

  const { data: member, error } = await auth.supabase
    .from("group_members")
    .select("role")
    .eq("group_id", groupId)
    .eq("user_id", auth.user.id)
    .maybeSingle()

  if (error || !member) {
    return {
      ...auth,
      member: null,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    }
  }

  return { ...auth, member, response: null }
}

export function isGroupModerator(role: string | null | undefined) {
  return role === "admin" || role === "moderator"
}
