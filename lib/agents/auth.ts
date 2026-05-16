/**
 * Auth gate for the /api/agents/* routes.
 *
 * The app uses a custom signed-cookie admin session (see lib/admin-auth.ts),
 * NOT Supabase Auth — we go through `verifyAdmin()` which validates the
 * cookie against the `admins` table.
 *
 * Returns either an `admin` payload or a `response` the route should send.
 */

import { verifyAdmin, verifySuperAdmin, type AdminSession } from "@/lib/admin-auth"

export interface AdminAuthResult {
  admin: AdminSession | null
  response: Response | null
}

export async function requireAdmin(): Promise<AdminAuthResult> {
  const admin = await verifyAdmin()
  if (!admin) {
    return {
      admin: null,
      response: Response.json({ error: "Unauthorized" }, { status: 401 }),
    }
  }
  return { admin, response: null }
}

export async function requireSuperAdmin(): Promise<AdminAuthResult> {
  const admin = await verifySuperAdmin()
  if (!admin) {
    return {
      admin: null,
      response: Response.json({ error: "Forbidden — owner access required" }, { status: 403 }),
    }
  }
  return { admin, response: null }
}
