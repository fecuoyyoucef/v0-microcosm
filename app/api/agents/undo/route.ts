import { NextResponse } from "next/server"
import { undoAction, listUndoable } from "@/lib/agents/undo"
import { requireAdmin } from "@/lib/agents/auth"

export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const actions = await listUndoable(50)
  return NextResponse.json({ actions })
}

export async function POST(req: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const body = await req.json().catch(() => null)
  const snapshotId = body?.snapshot_id ?? body?.action_id
  if (typeof snapshotId !== "string") {
    return NextResponse.json({ error: "snapshot_id is required" }, { status: 400 })
  }

  const ok = await undoAction(snapshotId, auth.admin!.id)
  return NextResponse.json({ success: ok })
}
