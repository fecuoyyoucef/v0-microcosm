import { createClient } from "@/lib/supabase/server"
import { isOwnerEmail } from "@/lib/admin-auth"

/**
 * Guard helper for admin-only API routes (the agent control plane).
 *
 * Returns a discriminated union so route handlers can branch cleanly:
 *   const guard = await requireAdmin()
 *   if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status })
 *   // guard.userId is now safe to use
 */
export type AdminGuard =
  | { ok: true; userId: string; email: string }
  | { ok: false; status: number; error: string }

export async function requireAdmin(): Promise<AdminGuard> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return { ok: false, status: 401, error: "Not authenticated" }
    if (!user.email || !isOwnerEmail(user.email)) {
      return { ok: false, status: 403, error: "Owner access required" }
    }

    return { ok: true, userId: user.id, email: user.email }
  } catch (err) {
    console.error("[auth/require-admin] failed:", err)
    return { ok: false, status: 500, error: "Auth check failed" }
  }
}
