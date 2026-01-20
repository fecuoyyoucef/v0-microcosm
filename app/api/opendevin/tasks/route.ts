import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const OPENDEVIN_API_URL = process.env.OPENDEVIN_API_URL || "http://localhost:8080"

/**
 * Create new OpenDevin task
 * POST /api/opendevin/tasks
 */
export async function POST(req: NextRequest) {
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

    // Check if user is admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (profile?.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 }
      )
    }

    const body = await req.json()
    const { instruction, project_path, max_iterations, context } = body

    if (!instruction) {
      return NextResponse.json(
        { error: "Instruction is required" },
        { status: 400 }
      )
    }

    console.log("[v0] Creating OpenDevin task:", instruction)

    // Call OpenDevin API
    const response = await fetch(`${OPENDEVIN_API_URL}/api/tasks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        instruction,
        project_path: project_path || "/workspace",
        max_iterations: max_iterations || 30,
        context,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || "Failed to create task")
    }

    const data = await response.json()

    // Log task creation
    await supabase.from("opendevin_tasks").insert({
      task_id: data.task_id,
      user_id: user.id,
      instruction,
      status: data.status,
      project_path,
      max_iterations,
    })

    console.log("[v0] OpenDevin task created:", data.task_id)

    return NextResponse.json(data)
  } catch (error) {
    console.error("[v0] OpenDevin task creation error:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

/**
 * List OpenDevin tasks
 * GET /api/opendevin/tasks
 */
export async function GET(req: NextRequest) {
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

    const searchParams = req.nextUrl.searchParams
    const status = searchParams.get("status")
    const limit = parseInt(searchParams.get("limit") || "50")

    // Build query URL
    let url = `${OPENDEVIN_API_URL}/api/tasks?limit=${limit}`
    if (status) {
      url += `&status=${status}`
    }

    const response = await fetch(url)

    if (!response.ok) {
      throw new Error("Failed to fetch tasks")
    }

    const data = await response.json()

    return NextResponse.json(data)
  } catch (error) {
    console.error("[v0] OpenDevin tasks fetch error:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
