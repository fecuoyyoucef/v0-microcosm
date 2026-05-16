/**
 * Auth gate for /api/agents/* routes.
 *
 * The app uses a custom signed-cookie admin session (see lib/admin-auth.ts),
 * NOT Supabase Auth — we go through `verifyAdmin()` which validates the
 * cookie against the `admins` table.
 *
 * Pattern:
 *
 *   const auth = await requireAdmin()
 *   if (!auth.ok) return auth.response
 *   // auth.admin is the verified session.
 */

import { verifyAdmin, verifySuperAdmin, type AdminSession } from "@/lib/admin-auth"

export type AdminAuthResult =
  | { ok: true; admin: AdminSession; response: null }
  | { ok: false; admin: null; response: Response }

export async function requireAdmin(): Promise<AdminAuthResult> {
  const admin = await verifyAdmin()
  if (!admin) {
    return {
      ok: false,
      admin: null,
      response: Response.json({ error: "Unauthorized" }, { status: 401 }),
    }
  }
  return { ok: true, admin, response: null }
}

export async function requireSuperAdmin(): Promise<AdminAuthResult> {
  const admin = await verifySuperAdmin()
  if (!admin) {
    return {
      ok: false,
      admin: null,
      response: Response.json({ error: "Forbidden — owner access required" }, { status: 403 }),
    }
  }
  return { ok: true, admin, response: null }
}
