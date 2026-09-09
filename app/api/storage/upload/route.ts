import { put } from "@vercel/blob"
import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"

const MAX_FILE_SIZE = 25 * 1024 * 1024

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const formData = await request.formData()
    const file = formData.get("file")
    const scope = String(formData.get("scope") || "user").replace(/[^a-z0-9_-]/gi, "")
    if (!(file instanceof File)) return NextResponse.json({ error: "Missing file" }, { status: 400 })
    if (file.size === 0 || file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File must be between 1 byte and 25 MB" }, { status: 413 })
    }

    const safeName = file.name.replace(/[^a-z0-9._-]/gi, "_").slice(-120) || "upload"
    const blob = await put(`microcosm/${scope}/${user.id}/${crypto.randomUUID()}-${safeName}`, file, {
      access: "private",
      addRandomSuffix: false,
      contentType: file.type || "application/octet-stream",
    })

    return NextResponse.json({ pathname: blob.pathname, contentType: blob.contentType, size: file.size })
  } catch (error) {
    console.error("Blob upload failed", error)
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }
}
