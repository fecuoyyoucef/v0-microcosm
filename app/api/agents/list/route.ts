/**
 * GET /api/agents/list — returns the static registry of available agents.
 */

import { requireAdmin } from "@/lib/agents/auth"
import { AGENTS } from "@/lib/agents"

export async function GET() {
  const auth = await requireAdmin()
  if (auth.response) return auth.response

  const agents = Object.values(AGENTS).map((a) => ({
    kind: a.kind,
    displayName: a.displayName,
    description: a.description,
    model: a.model,
    tools: a.tools,
  }))
  return Response.json({ agents })
}
