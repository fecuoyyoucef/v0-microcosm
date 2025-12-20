import { type NextRequest, NextResponse } from "next/server"
import { getActiveDocument, getAllDocumentVersions, type DocumentType } from "@/lib/supabase/legal-documents"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const type = searchParams.get("type") as DocumentType | null
  const allVersions = searchParams.get("all_versions") === "true"

  if (!type || (type !== "privacy_policy" && type !== "terms_of_service")) {
    return NextResponse.json({ error: "Invalid document type" }, { status: 400 })
  }

  if (allVersions) {
    const documents = await getAllDocumentVersions(type)
    return NextResponse.json({ documents })
  }

  const document = await getActiveDocument(type)

  if (!document) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 })
  }

  return NextResponse.json({ document })
}
