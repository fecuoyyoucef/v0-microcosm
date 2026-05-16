/**
 * Shared auth helper for the /api/agents/* routes.
 *
 * Every agent endpoint must verify that the caller is an authenticated
 * admin. We return either a `userId` (admin authorized) or a `Response`
 * the route should return verbatim.
 */

import { createClient, createServiceClient } from "@/lib/supabase/server"

export interface AdminAuthResult {
  userId: string | null
  response: Response | null
}

export async function requireAdmin(): Promise<AdminAuthResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      userId: null,
      response: Response.json({ error: "Unauthorized" }, { status: 401 }),
    }
  }

  // Use the service client for the role check so RLS can't hide the row.
  const svc = createServiceClient()
  const { data: profile, error } = await svc
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (error || profile?.role !== "admin") {
    return {
      userId: user.id,
      response: Response.json({ error: "Forbidden" }, { status: 403 }),
    }
  }

  return { userId: user.id, response: null }
}
