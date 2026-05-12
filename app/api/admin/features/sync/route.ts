import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { syncFeatures } from "@/lib/feature-registry-server"

// POST - مزامنة الميزات من الكود إلى قاعدة البيانات
export async function POST(request: NextRequest) {
  const cookieStore = await cookies()
  const adminToken = cookieStore.get("admin_session")

  if (!adminToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const result = await syncFeatures()

    return NextResponse.json({
      success: true,
      ...result,
      message: `تمت إضافة ${result.added} ميزة جديدة وتحديث ${result.updated} ميزة`,
    })
  } catch (error) {
    console.error("[Feature Sync] Error:", error)
    return NextResponse.json({ error: "Failed to sync features" }, { status: 500 })
  }
}
