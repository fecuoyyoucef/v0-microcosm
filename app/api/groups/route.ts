import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: userData, error: userError } = await supabase.auth.getUser()

    if (userError || !userData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { name, description, cell_category, goal } = body

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

    const { data: group, error: groupError } = await supabase
      .from("groups")
      .insert({
        name: name.trim(),
        description: description?.trim() || null,
        created_by: userData.user.id,
        group_type: "primary",
        cell_category: cell_category || "general",
        goal: goal || "التواصل والتعاون",
        responsibility_score: 100,
        progress_score: cell_category === "project" ? 0 : null,
        last_activity_date: new Date().toISOString(),
      })
      .select()
      .single()

    if (groupError) {
      console.error("Error creating group:", groupError)
      return NextResponse.json({ error: "Failed to create group" }, { status: 500 })
    }

    // Add creator as admin
    const { error: memberError } = await supabase.from("group_members").insert({
      group_id: group.id,
      user_id: userData.user.id,
      role: "admin",
    })

    if (memberError) {
      console.error("Error adding creator as member:", memberError)
    }

    // Create default conversation node
    const { error: nodeError } = await supabase.from("conversation_nodes").insert({
      group_id: group.id,
      title: "المحادثة الرئيسية",
      description: "النقاشات العامة",
      color: "#3b82f6",
      icon: "MessageSquare",
      node_type: "primary",
      is_default: true,
      sort_order: 0,
      position_x: 0,
      position_y: 0,
      created_by: userData.user.id,
    })

    if (nodeError) {
      console.error("Error creating default node:", nodeError)
    }

    return NextResponse.json({ ...group, needsSurvey: true })
  } catch (error) {
    console.error("Error in POST /api/groups:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
