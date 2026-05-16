import { NextResponse } from "next/server"
import { undoAction, listUndoable } from "@/lib/agents/undo"
import { requireAdmin } from "@/lib/auth/require-admin"

export async function GET() {
  const guard = await requireAdmin()
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status })
  const actions = await listUndoable(50)
  return NextResponse.json({ actions })
}

export async function POST(req: Request) {
  const guard = await requireAdmin()
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status })

  const body = await req.json().catch(() => null)
  if (!body || typeof body.action_id !== "string") {
    return NextResponse.json({ error: "action_id is required" }, { status: 400 })
  }

  const ok = await undoAction(body.action_id, guard.userId)
  return NextResponse.json({ success: ok })
}
