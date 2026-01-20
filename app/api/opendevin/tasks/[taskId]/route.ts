import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const OPENDEVIN_API_URL = process.env.OPENDEVIN_API_URL || "http://localhost:8080"

/**
 * Get OpenDevin task status
 * GET /api/opendevin/tasks/[taskId]
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { taskId: string } }
) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { taskId } = params

    console.log("[v0] Fetching OpenDevin task status:", taskId)

    // Call OpenDevin API
    const response = await fetch(`${OPENDEVIN_API_URL}/api/tasks/${taskId}`)

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { error: "Task not found" },
          { status: 404 }
        )
      }
      throw new Error("Failed to fetch task status")
    }

    const data = await response.json()

    // Update database
    await supabase
      .from("opendevin_tasks")
      .update({
        status: data.status,
        progress: data.progress,
        result: data.result,
        error: data.error,
        updated_at: new Date().toISOString(),
      })
      .eq("task_id", taskId)

    return NextResponse.json(data)
  } catch (error) {
    console.error("[v0] OpenDevin task status error:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

/**
 * Delete OpenDevin task
 * DELETE /api/opendevin/tasks/[taskId]
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { taskId: string } }
) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { taskId } = params

    console.log("[v0] Deleting OpenDevin task:", taskId)

    // Call OpenDevin API
    const response = await fetch(`${OPENDEVIN_API_URL}/api/tasks/${taskId}`, {
      method: "DELETE",
    })

    if (!response.ok) {
      throw new Error("Failed to delete task")
    }

    // Delete from database
    await supabase
      .from("opendevin_tasks")
      .delete()
      .eq("task_id", taskId)

    return NextResponse.json({
      message: "Task deleted successfully",
    })
  } catch (error) {
    console.error("[v0] OpenDevin task deletion error:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
