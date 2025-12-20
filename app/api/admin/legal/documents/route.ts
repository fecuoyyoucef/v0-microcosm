import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { createDocumentVersion, type DocumentType } from "@/lib/supabase/legal-documents"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()

    // Check if user is admin
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

    if (!profile || profile.role !== "owner") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 })
    }

    const { type, title, content } = await request.json()

    if (!type || !title || !content) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    if (type !== "privacy_policy" && type !== "terms_of_service") {
      return NextResponse.json({ error: "Invalid document type" }, { status: 400 })
    }

    const result = await createDocumentVersion(type as DocumentType, title, content)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error creating document:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
