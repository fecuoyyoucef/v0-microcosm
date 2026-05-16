/**
 * GET  /api/agents/approvals          → pending approvals
 * POST /api/agents/approvals          → { id, decision: "approved"|"rejected", reason? }
 */

import { requireAdmin } from "@/lib/agents/auth"
import { createServiceClient } from "@/lib/supabase/server"

export async function GET() {
  const auth = await requireAdmin()
  if (auth.response) return auth.response

  const svc = createServiceClient()
  const { data, error } = await svc
    .from("agent_approvals")
    .select("*")
    .eq("status", "pending")
    .order("requested_at", { ascending: false })
    .limit(100)

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ approvals: data ?? [] })
}

export async function POST(req: Request) {
  const auth = await requireAdmin()
  if (auth.response) return auth.response

  let body: { id?: string; decision?: string; reason?: string }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const { id, decision, reason } = body
  if (!id || (decision !== "approved" && decision !== "rejected")) {
    return Response.json(
      { error: "id and decision ('approved'|'rejected') required" },
      { status: 400 },
    )
  }

  const svc = createServiceClient()
  const { data, error } = await svc
    .from("agent_approvals")
    .update({
      status: decision,
      decided_at: new Date().toISOString(),
      decided_by: auth.userId,
      reason: reason ?? null,
    })
    .eq("id", id)
    .eq("status", "pending")
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  if (!data) {
    return Response.json(
      { error: "Approval not found or already decided" },
      { status: 404 },
    )
  }
  return Response.json({ approval: data })
}
