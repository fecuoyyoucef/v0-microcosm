/**
 * GET    /api/agents/settings  → list all agents and their state
 * PATCH  /api/agents/settings  → update one agent (enabled/model/config)
 *
 * The `agents` table is the source of truth; the runtime reads enabled +
 * model from it on every dispatch. Updates here take effect immediately
 * for the next run.
 */

import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/agents/auth"
import { createServiceClient } from "@/lib/supabase/server"

export const runtime = "nodejs"

const ALLOWED_MODELS = new Set([
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
  "mixtral-8x7b-32768",
  "gemma2-9b-it",
])

export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response

  const { data, error } = await createServiceClient()
    .from("agents")
    .select("id, name, description, model, enabled, config, updated_at")
    .order("id")

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ agents: data ?? [] })
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response

  const body = await request.json().catch(() => null)
  if (!body?.id || typeof body.id !== "string") {
    return NextResponse.json({ error: "id is required" }, { status: 400 })
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (typeof body.enabled === "boolean") patch.enabled = body.enabled
  if (typeof body.model === "string") {
    if (!ALLOWED_MODELS.has(body.model)) {
      return NextResponse.json({ error: "Unsupported model" }, { status: 400 })
    }
    patch.model = body.model
  }
  if (body.config && typeof body.config === "object") patch.config = body.config

  const { data, error } = await createServiceClient()
    .from("agents")
    .update(patch)
    .eq("id", body.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ agent: data })
}
