import { type NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"
import { UndoSystem } from "@/lib/ai-agents/undo-system"

export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const undoSystem = new UndoSystem()
    const actions = await undoSystem.getActionHistory()

    return NextResponse.json({ actions })
  } catch (error: any) {
    console.error("[v0] Error listing actions:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase.from("profiles").select("is_owner").eq("id", user.id).single()

    if (!profile?.is_owner) {
      return NextResponse.json({ error: "Only owner can undo actions" }, { status: 403 })
    }

    const { action_id } = await request.json()

    const undoSystem = new UndoSystem()
    const success = await undoSystem.undoAction(action_id, user.id)

    if (success) {
      return NextResponse.json({
        success: true,
        message: "Action successfully undone and restored",
      })
    }

    return NextResponse.json(
      {
        success: false,
        message: "Failed to undo action",
      },
      { status: 500 },
    )
  } catch (error: any) {
    console.error("[v0] Error in undo route:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
