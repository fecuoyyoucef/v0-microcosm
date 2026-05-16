import { NextResponse } from "next/server"
import { approve, reject, listPendingApprovals, executeApprovedAction } from "@/lib/agents/approvals"
import { requireAdmin } from "@/lib/auth/require-admin"

export async function GET() {
  const guard = await requireAdmin()
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status })

  const pending = await listPendingApprovals()
  return NextResponse.json({ pending })
}

export async function POST(req: Request) {
  const guard = await requireAdmin()
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status })

  const body = await req.json().catch(() => null)
  if (!body || typeof body.request_id !== "string" || typeof body.action !== "string") {
    return NextResponse.json({ error: "request_id and action are required" }, { status: 400 })
  }

  if (body.action === "approve") {
    await approve(body.request_id, guard.userId)
    if (body.execute_now) {
      const result = await executeApprovedAction(body.request_id, guard.userId)
      return NextResponse.json({ approved: true, executed: true, result })
    }
    return NextResponse.json({ approved: true })
  }

  if (body.action === "reject") {
    await reject(body.request_id, guard.userId)
    return NextResponse.json({ rejected: true })
  }

  if (body.action === "execute") {
    const result = await executeApprovedAction(body.request_id, guard.userId)
    return NextResponse.json({ executed: true, result })
  }

  return NextResponse.json({ error: `Unknown action: ${body.action}` }, { status: 400 })
}
